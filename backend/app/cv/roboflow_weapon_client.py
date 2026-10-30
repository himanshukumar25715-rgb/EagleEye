import cv2
import base64
import requests
import json
import numpy as np
from typing import List, Dict, Any, Optional
from app.core.config import settings

class RoboflowWeaponClient:
    """
    Client for Roboflow Serverless Workflow:
    cctv-gun-and-knife-video-review-1793338581900
    Specialized in detecting firearms (guns, pistols, rifles) and edged weapons (knives, blades)
    in CCTV surveillance feeds.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        self.endpoint_url = endpoint_url or settings.ROBOFLOW_WORKFLOW_URL
        self.api_key = api_key or settings.ROBOFLOW_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def detect_weapons(self, frame: np.ndarray, confidence_thresh: float = 0.40) -> List[Dict[str, Any]]:
        """
        Sends frame to Roboflow CCTV Gun & Knife workflow.
        Returns list of detections:
        [{ "class": "gun", "confidence": 0.88, "bbox": [x1, y1, x2, y2], "centroid": (cx, cy) }]
        """
        if not settings.USE_ROBOFLOW_WEAPON_API or not self.api_key:
            return []

        try:
            # Encode frame to JPEG and then base64
            # Resize slightly if too large to conserve bandwidth & latency
            h, w = frame.shape[:2]
            scale = 1.0
            if max(h, w) > 640:
                scale = 640.0 / max(h, w)
                target_w, target_h = int(w * scale), int(h * scale)
                frame_to_send = cv2.resize(frame, (target_w, target_h))
            else:
                frame_to_send = frame

            _, buffer = cv2.imencode(".jpg", frame_to_send, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            b64_str = base64.b64encode(buffer).decode("utf-8")

            payload = {
                "inputs": {
                    "image": {"type": "base64", "value": b64_str}
                }
            }

            response = requests.post(
                self.endpoint_url,
                headers=self.headers,
                json=payload,
                timeout=4.0
            )

            if response.status_code != 200:
                return []

            data = response.json()
            outputs = data.get("outputs", [])
            if not outputs:
                return []

            # Extract predictions from Roboflow workflow output
            pred_container = outputs[0].get("predictions", {})
            raw_predictions = pred_container.get("predictions", []) if isinstance(pred_container, dict) else []

            weapons = []
            for pred in raw_predictions:
                conf = float(pred.get("confidence", 0.0))
                if conf < confidence_thresh:
                    continue

                label = str(pred.get("class", "weapon")).lower()
                
                # Coordinate parsing: center x, center y, width, height
                px = float(pred.get("x", 0.0)) / scale
                py = float(pred.get("y", 0.0)) / scale
                pw = float(pred.get("width", 0.0)) / scale
                ph = float(pred.get("height", 0.0)) / scale

                x1 = int(max(0, px - pw / 2.0))
                y1 = int(max(0, py - ph / 2.0))
                x2 = int(min(w, px + pw / 2.0))
                y2 = int(min(h, py + ph / 2.0))

                weapons.append({
                    "class": label,
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2],
                    "centroid": (px, py)
                })

            return weapons

        except Exception as e:
            # Fallback quietly without crashing the video streamer
            return []
