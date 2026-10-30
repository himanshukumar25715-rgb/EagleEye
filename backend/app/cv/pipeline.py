import os
import cv2
import time
import json
import hashlib
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from ultralytics import YOLO
from app.core.config import settings
from app.cv.roboflow_weapon_client import RoboflowWeaponClient

# Mapping of relevant COCO classes for Eagle Eye 2.0
PERSON_CLASS_ID = 0
BAG_CLASS_IDS = {24, 26, 28} # backpack, handbag, suitcase
WEAPON_CLASS_IDS = {43, 76, 34} # knife, scissors, baseball bat (dangerous items baseline)

class YOLO11SurveillancePipeline:
    """
    Eagle Eye AI 2.0 Computer Vision Pipeline powered by Ultralytics YOLO11.
    Implements Section 9 & 9.2 multi-frame event verification rules:
    - 🗡️ Weapon detection with multi-frame confirmation & track cooldown
    - 🥊 Fight/violence detection via person-proximity and rapid motion dynamics
    - 🎒 Unattended object tracking with stationary timer & owner radius
    - 👥 Overcrowding threshold detection
    """

    def __init__(self, weights_path: Optional[str] = None):
        if weights_path is None:
            custom_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11_aboda_best.pt")
            default_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11n.pt")
            if os.path.exists(custom_weights):
                weights_path = custom_weights
            elif os.path.exists(default_weights):
                weights_path = default_weights
            else:
                weights_path = "yolo11n.pt"

        print(f"[EagleEye YOLO11] Initializing neural network from {weights_path}...")
        self.model = YOLO(weights_path)
        self.roboflow_client = RoboflowWeaponClient()

        # Module 1: Weapon multi-frame state: track_id -> list of bools (last 5 processed frames)
        self.weapon_history: Dict[str, List[bool]] = {}
        self.weapon_cooldown: Dict[str, float] = {}

        # Module 2: Fight / Violence motion & proximity state
        # track_id -> (centroid_x, centroid_y, last_timestamp)
        self.person_positions: Dict[str, Tuple[float, float, float]] = {}
        self.fight_candidate_start: Optional[float] = None
        self.fight_cooldown: float = 0.0

        # Module 3: Unattended Bag state:
        # bag_id -> {"first_seen": ts, "stationary_since": ts, "last_x": x, "last_y": y}
        self.bag_tracks: Dict[str, Dict[str, Any]] = {}
        self.bag_alert_sent: Dict[str, bool] = {}

        # Module 4: Overcrowding state
        self.crowd_start_time: Optional[float] = None
        self.crowd_cooldown: float = 0.0

    def process_frame(
        self,
        frame: np.ndarray,
        frame_idx: int,
        fps: float,
        timestamp: float
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Runs YOLO11 tracking and applies Section 9.2 event rules.
        Returns:
            - annotated_frame (np.ndarray)
            - candidate_alerts (list of event dicts)
        """
        h, w = frame.shape[:2]
        candidate_alerts: List[Dict[str, Any]] = []

        # Run YOLO11 inference with built-in ByteTrack object tracking
        try:
            results = self.model.track(
                source=frame,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False,
                conf=0.25,
                imgsz=640
            )
            det = results[0]
        except Exception:
            # Fallback to standard detect if tracking fails
            results = self.model(source=frame, verbose=False, conf=0.25, imgsz=640)
            det = results[0]

        boxes = det.boxes
        annotated = frame.copy()

        detected_persons: List[Dict[str, Any]] = []
        detected_bags: List[Dict[str, Any]] = []
        detected_weapons: List[Dict[str, Any]] = []

        if boxes is not None and len(boxes) > 0:
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                coords = box.xyxy[0].cpu().numpy().astype(int) # [x1, y1, x2, y2]
                
                track_id = str(int(box.id[0].item())) if box.id is not None else f"det_{i}"
                cx = (coords[0] + coords[2]) / 2.0
                cy = (coords[1] + coords[3]) / 2.0

                item_info = {
                    "track_id": track_id,
                    "conf": conf,
                    "bbox": coords.tolist(),
                    "centroid": (cx, cy)
                }

                if cls_id == PERSON_CLASS_ID:
                    detected_persons.append(item_info)
                elif cls_id in BAG_CLASS_IDS:
                    detected_bags.append(item_info)
                elif cls_id in WEAPON_CLASS_IDS:
                    detected_weapons.append(item_info)

        # Query Roboflow Serverless Workflow (CCTV Gun & Knife) every few frames or when persons exist
        if detected_persons and frame_idx % max(1, int(fps // 2)) == 0:
            rf_weapons = self.roboflow_client.detect_weapons(frame, confidence_thresh=settings.WEAPON_CONFIDENCE_THRESHOLD)
            for rf_w in rf_weapons:
                detected_weapons.append({
                    "track_id": f"rf_{rf_w['class']}",
                    "conf": rf_w["confidence"],
                    "bbox": rf_w["bbox"],
                    "centroid": rf_w["centroid"],
                    "label": rf_w["class"]
                })

        # -------------------------------------------------------------
        # MODULE 1: Weapon Detection with Multi-frame Verification (Section 9.2)
        # -------------------------------------------------------------
        current_frame_weapon_ids = set()
        for w_item in detected_weapons:
            track_id = w_item["track_id"]
            conf = w_item["conf"]
            current_frame_weapon_ids.add(track_id)

            if conf >= settings.WEAPON_CONFIDENCE_THRESHOLD:
                history = self.weapon_history.get(track_id, [])
                history.append(True)
                if len(history) > 5:
                    history.pop(0)
                self.weapon_history[track_id] = history

                # Multi-frame rule: seen in at least 3 of last 5 frames
                if sum(history) >= settings.WEAPON_MIN_FRAMES_IN_LAST_5:
                    last_alert = self.weapon_cooldown.get(track_id, 0.0)
                    if (timestamp - last_alert) >= settings.WEAPON_COOLDOWN_SECONDS:
                        self.weapon_cooldown[track_id] = timestamp
                        candidate_alerts.append({
                            "type": "weapon",
                            "confidence": round(conf, 2),
                            "track_id": track_id,
                            "bbox": w_item["bbox"],
                            "description": f"CCTV Weapon Alert: {w_item.get('label', 'weapon').upper()} detected (Roboflow AI)"
                        })

        # Clean history for lost tracks
        for trk in list(self.weapon_history.keys()):
            if trk not in current_frame_weapon_ids:
                self.weapon_history[trk].append(False)
                if len(self.weapon_history[trk]) > 5:
                    self.weapon_history[trk].pop(0)

        # -------------------------------------------------------------
        # MODULE 2: Fight / Violence Proximity & Motion Dynamics (Section 9.2)
        # -------------------------------------------------------------
        high_motion_detected = False
        scuffle_bbox = None

        if len(detected_persons) >= 2:
            # Check pairwise distance and rapid velocity change
            for i in range(len(detected_persons)):
                for j in range(i + 1, len(detected_persons)):
                    p1 = detected_persons[i]
                    p2 = detected_persons[j]

                    dx = p1["centroid"][0] - p2["centroid"][0]
                    dy = p1["centroid"][1] - p2["centroid"][1]
                    dist = np.sqrt(dx * dx + dy * dy)

                    # Interpersonal distance < 120 px indicates physical entanglement/scuffle
                    if dist < 120:
                        # Check motion delta of p1 from previous frame
                        prev1 = self.person_positions.get(p1["track_id"])
                        if prev1:
                            px1, py1, prev_t = prev1
                            dt = max(0.001, timestamp - prev_t)
                            speed1 = np.sqrt((p1["centroid"][0] - px1)**2 + (p1["centroid"][1] - py1)**2) / dt
                            
                            # High velocity / abrupt jerk interaction
                            if speed1 > 280:
                                high_motion_detected = True
                                # Enclosing bounding box of both persons
                                scuffle_bbox = [
                                    min(p1["bbox"][0], p2["bbox"][0]),
                                    min(p1["bbox"][1], p2["bbox"][1]),
                                    max(p1["bbox"][2], p2["bbox"][2]),
                                    max(p1["bbox"][3], p2["bbox"][3]),
                                ]
                                break
                if high_motion_detected:
                    break

        if high_motion_detected:
            if self.fight_candidate_start is None:
                self.fight_candidate_start = timestamp
            elif (timestamp - self.fight_candidate_start) >= settings.FIGHT_WINDOW_SECONDS:
                if (timestamp - self.fight_cooldown) >= settings.FIGHT_COOLDOWN_SECONDS:
                    self.fight_cooldown = timestamp
                    candidate_alerts.append({
                        "type": "fight",
                        "confidence": 0.82,
                        "track_id": "FIGHT_ENGAGE",
                        "bbox": scuffle_bbox or [0, 0, w, h],
                        "description": "Physical violence/fight detected via high-motion proximity"
                    })
        else:
            self.fight_candidate_start = None

        # Update person position cache
        for p in detected_persons:
            self.person_positions[p["track_id"]] = (p["centroid"][0], p["centroid"][1], timestamp)

        # -------------------------------------------------------------
        # MODULE 3: Unattended Object / Bag Detection (Section 9.2)
        # -------------------------------------------------------------
        for bag in detected_bags:
            b_id = bag["track_id"]
            bx, by = bag["centroid"]

            if b_id not in self.bag_tracks:
                self.bag_tracks[b_id] = {
                    "first_seen": timestamp,
                    "stationary_since": timestamp,
                    "last_x": bx,
                    "last_y": by
                }
            else:
                track_data = self.bag_tracks[b_id]
                # Check displacement
                disp = np.sqrt((bx - track_data["last_x"])**2 + (by - track_data["last_y"])**2)
                if disp > 25:
                    track_data["stationary_since"] = timestamp
                    track_data["last_x"] = bx
                    track_data["last_y"] = by

            # Check if any person is within calibrated radius
            stationary_duration = timestamp - self.bag_tracks[b_id]["stationary_since"]
            has_person_near = False
            for p in detected_persons:
                px, py = p["centroid"]
                if np.sqrt((bx - px)**2 + (by - py)**2) <= settings.UNATTENDED_BAG_RADIUS_PX:
                    has_person_near = True
                    break

            # Trigger alert if stationary without owner for specified seconds
            # (In prototype video demo, threshold can trigger after 15-30s if configured)
            if not has_person_near and stationary_duration >= min(15.0, settings.UNATTENDED_BAG_TIME_SECONDS):
                if not self.bag_alert_sent.get(b_id, False):
                    self.bag_alert_sent[b_id] = True
                    candidate_alerts.append({
                        "type": "unattended_object",
                        "confidence": round(bag["conf"], 2),
                        "track_id": b_id,
                        "bbox": bag["bbox"],
                        "description": f"Bag stationary for {int(stationary_duration)}s without owner"
                    })

        # -------------------------------------------------------------
        # MODULE 4: Overcrowding Detection (Section 9.2)
        # -------------------------------------------------------------
        person_count = len(detected_persons)
        # For prototype demonstration, trigger when person count reaches or exceeds threshold
        # (or >= 8 for standard camera test frames)
        if person_count >= settings.CROWD_OVERCROWDING_THRESHOLD:
            if self.crowd_start_time is None:
                self.crowd_start_time = timestamp
            elif (timestamp - self.crowd_start_time) >= settings.CROWD_DURATION_SECONDS:
                if (timestamp - self.crowd_cooldown) >= 30.0:
                    self.crowd_cooldown = timestamp
                    candidate_alerts.append({
                        "type": "overcrowding",
                        "confidence": 0.90,
                        "track_id": f"CROWD-{person_count}",
                        "bbox": [10, 10, w - 10, h - 10],
                        "description": f"Overcrowding alert: {person_count} persons detected"
                    })
        else:
            self.crowd_start_time = None

        # -------------------------------------------------------------
        # VISUAL RENDERING: Bounding Boxes & Eagle Eye HUD Overlay
        # -------------------------------------------------------------
        # Draw Persons
        for p in detected_persons:
            b = p["bbox"]
            cv2.rectangle(annotated, (b[0], b[1]), (b[2], b[3]), (0, 200, 100), 2)
            cv2.putText(
                annotated,
                f"Person #{p['track_id']} ({int(p['conf']*100)}%)",
                (b[0], max(15, b[1] - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 255, 120),
                1,
                cv2.LINE_AA
            )

        # Draw Bags
        for bg in detected_bags:
            b = bg["bbox"]
            cv2.rectangle(annotated, (b[0], b[1]), (b[2], b[3]), (255, 165, 0), 2)
            cv2.putText(
                annotated,
                f"Bag #{bg['track_id']}",
                (b[0], max(15, b[1] - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 190, 50),
                1,
                cv2.LINE_AA
            )

        # Draw Weapons (Red highlight)
        for wp in detected_weapons:
            b = wp["bbox"]
            cv2.rectangle(annotated, (b[0], b[1]), (b[2], b[3]), (0, 0, 255), 3)
            cv2.putText(
                annotated,
                f"! WEAPON TRK #{wp['track_id']} !",
                (b[0], max(20, b[1] - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 0, 255),
                2,
                cv2.LINE_AA
            )

        # Draw Scuffle highlight if active
        if high_motion_detected and scuffle_bbox:
            sb = scuffle_bbox
            cv2.rectangle(annotated, (sb[0], sb[1]), (sb[2], sb[3]), (0, 140, 255), 2)
            cv2.putText(
                annotated,
                "WARNING: HIGH MOTION SCUFFLE",
                (sb[0], max(25, sb[1] - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 165, 255),
                2,
                cv2.LINE_AA
            )

        # Top Surveillance HUD Bar (Dark Green & Gold)
        cv2.rectangle(annotated, (0, 0), (w, 42), (8, 14, 10), -1) # Dark green bar
        cv2.putText(
            annotated,
            f"EAGLE EYE 2.0 | YOLO11n | Persons: {len(detected_persons)} | Bags: {len(detected_bags)} | Events: {len(candidate_alerts)}",
            (15, 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 215, 255), # Gold accent
            2,
            cv2.LINE_AA
        )
        cv2.putText(
            annotated,
            f"{timestamp:.1f}s",
            (w - 75, 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (200, 200, 200),
            1,
            cv2.LINE_AA
        )

        return annotated, candidate_alerts


def calculate_sha256(filepath: str) -> str:
    """Calculates SHA-256 for evidentiary chain of custody"""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()
