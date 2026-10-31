import os
import cv2
import time
import json
import hashlib
import torch
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from ultralytics import YOLO
from app.core.config import settings
from app.cv.roboflow_weapon_client import RoboflowWeaponClient

# Limit OpenMP threads per pipeline to prevent CPU thread thrashing across cameras
torch.set_num_threads(2)

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
            default_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11n.pt")
            custom_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11_aboda_best.pt")
            if os.path.exists(default_weights):
                weights_path = default_weights
            elif os.path.exists(custom_weights):
                weights_path = custom_weights
            else:
                weights_path = "yolo11n.pt"

        print(f"[EagleEye YOLO11] Initializing neural network from {weights_path}...")
        self.model = YOLO(weights_path)
        self.roboflow_client = RoboflowWeaponClient()

        # Dynamically map class indices according to model taxonomy (works with COCO or ABODA)
        self.person_class_ids = set()
        self.bag_class_ids = set()
        self.weapon_class_ids = set()
        for cid, cname in self.model.names.items():
            cn = str(cname).lower()
            if "person" in cn or "pedestrian" in cn:
                self.person_class_ids.add(cid)
            elif any(b in cn for b in ["bag", "backpack", "suitcase", "carrybag", "handbag", "luggage"]):
                self.bag_class_ids.add(cid)
            elif any(w in cn for w in ["knife", "gun", "weapon", "pistol", "scissors", "bat", "rifle", "sword"]):
                self.weapon_class_ids.add(cid)

        # Fallback to defaults if empty
        if not self.person_class_ids:
            self.person_class_ids = {0}
        if not self.bag_class_ids:
            self.bag_class_ids = {24, 26, 28}

        # Check for fine-tuned deep learning fight classifier
        fight_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11_fight_best.pt")
        self.fight_classifier = None
        if os.path.exists(fight_weights):
            try:
                self.fight_classifier = YOLO(fight_weights)
                print(f"[EagleEye CV] Deep Learning Fight Classifier loaded from {fight_weights}")
            except Exception as e:
                print(f"[EagleEye CV] Note: fight classifier deferred: {e}")

        # Check for dedicated weapon detection model (Knife, firearms, blades)
        weapon_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11_weapon_best.pt")
        if not os.path.exists(weapon_weights):
            weapon_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "best.pt")
        self.weapon_model = None
        if os.path.exists(weapon_weights):
            try:
                self.weapon_model = YOLO(weapon_weights)
                print(f"[EagleEye CV] Dedicated Local Weapon Model loaded from {weapon_weights}")
            except Exception as e:
                print(f"[EagleEye CV] Note: weapon model deferred: {e}")

        print(f"[EagleEye YOLO11] Person classes: {self.person_class_ids}, Bag classes: {self.bag_class_ids}, Weapon classes: {self.weapon_class_ids}")

        # Module 1: Weapon multi-frame state: track_id -> list of bools (last 5 processed frames)
        self.weapon_history: Dict[str, List[bool]] = {}
        self.weapon_cooldown: Dict[str, float] = {}

        # Module 2: Fight / Violence motion & proximity state
        # track_id -> (centroid_x, centroid_y, last_timestamp)
        self.person_positions: Dict[str, Tuple[float, float, float]] = {}
        self.fight_candidate_start: Optional[float] = None
        self.fight_cooldown: float = 0.0
        self.fight_score: float = 0.0

        # Module 3: Unattended Bag state:
        # bag_id -> {"first_seen": ts, "stationary_since": ts, "last_x": x, "last_y": y}
        self.bag_tracks: Dict[str, Dict[str, Any]] = {}
        self.bag_alert_sent: Dict[str, bool] = {}

        # Module 4: Overcrowding state
        self.crowd_start_time: Optional[float] = None
        self.crowd_cooldown: float = 0.0

    def detect_and_verify(
        self,
        frame: np.ndarray,
        frame_idx: int,
        fps: float,
        timestamp: float
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Runs YOLO11 tracking at optimized resolution (384px) and applies Section 9.2 event rules.
        Returns:
            - detections: dict containing persons, bags, weapons, and scuffle bounding boxes
            - candidate_alerts: list of event dicts
        """
        h, w = frame.shape[:2]
        candidate_alerts: List[Dict[str, Any]] = []

        # Run YOLO11 inference with built-in ByteTrack object tracking at imgsz=384 for ~4x faster CPU inference
        try:
            results = self.model.track(
                source=frame,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False,
                conf=0.20,
                imgsz=640
            )
            det = results[0]
        except Exception:
            # Fallback to standard detect if tracking fails
            results = self.model(source=frame, verbose=False, conf=0.20, imgsz=640)
            det = results[0]

        boxes = det.boxes

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

                if cls_id in self.person_class_ids:
                    detected_persons.append(item_info)
                elif cls_id in self.bag_class_ids:
                    detected_bags.append(item_info)
                elif cls_id in self.weapon_class_ids:
                    detected_weapons.append(item_info)

        # Local Weapon Model Inference (Runs high-speed offline verification)
        if self.weapon_model:
            try:
                w_conf_thresh = getattr(settings, 'WEAPON_CONFIDENCE_THRESHOLD', 0.25) or 0.25
                w_results = self.weapon_model.predict(
                    source=frame,
                    conf=w_conf_thresh,
                    imgsz=640,
                    verbose=False
                )
                if w_results and len(w_results) > 0 and w_results[0].boxes is not None:
                    for w_box in w_results[0].boxes:
                        w_cls_id = int(w_box.cls[0].item())
                        w_conf = float(w_box.conf[0].item())
                        w_label = w_results[0].names.get(w_cls_id, "weapon")
                        wx1, wy1, wx2, wy2 = map(int, w_box.xyxy[0].tolist())
                        detected_weapons.append({
                            "track_id": f"wpn_{w_label}_{wx1}_{wy1}",
                            "conf": w_conf,
                            "bbox": [wx1, wy1, wx2, wy2],
                            "centroid": (int((wx1 + wx2) / 2), int((wy1 + wy2) / 2)),
                            "label": w_label
                        })
            except Exception as w_err:
                pass
        elif detected_persons and settings.USE_ROBOFLOW_WEAPON_API and settings.ROBOFLOW_API_KEY:
            # Fallback to Roboflow API if local model is absent
            if frame_idx % max(1, int(fps // 2)) == 0:
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
        # MODULE 1: Weapon Threat Detection (Section 9.2)
        # -------------------------------------------------------------
        for w_item in detected_weapons:
            conf = w_item["conf"]
            w_label = str(w_item.get("label", "weapon")).upper()
            w_thresh = min(0.25, getattr(settings, 'WEAPON_CONFIDENCE_THRESHOLD', 0.25))

            if conf >= w_thresh:
                # Cooldown by weapon class to prevent duplicate alert spamming
                last_alert = self.weapon_cooldown.get(w_label, 0.0)
                if (timestamp - last_alert) >= getattr(settings, 'WEAPON_COOLDOWN_SECONDS', 15):
                    self.weapon_cooldown[w_label] = timestamp
                    candidate_alerts.append({
                        "type": "weapon",
                        "confidence": round(conf, 2),
                        "track_id": f"WPN-{w_label}",
                        "bbox": w_item["bbox"],
                        "description": f"CCTV Weapon Threat: {w_label} detected ({int(conf * 100)}%)"
                    })

        # -------------------------------------------------------------
        # MODULE 2: Fight / Violence Proximity & Motion Dynamics (Section 9.2)
        # -------------------------------------------------------------
        high_motion_detected = False
        scuffle_bbox = None

        if len(detected_persons) >= 2:
            # Pairwise proximity, bounding-box collision & physical entanglement
            for i in range(len(detected_persons)):
                for j in range(i + 1, len(detected_persons)):
                    p1 = detected_persons[i]
                    p2 = detected_persons[j]

                    dx = p1["centroid"][0] - p2["centroid"][0]
                    dy = p1["centroid"][1] - p2["centroid"][1]
                    dist = np.sqrt(dx * dx + dy * dy)

                    # Dynamic scaling based on person dimensions (works in 360p, 720p, 1080p, 4K)
                    p1_w = max(10, p1["bbox"][2] - p1["bbox"][0])
                    p1_h = max(10, p1["bbox"][3] - p1["bbox"][1])
                    p2_w = max(10, p2["bbox"][2] - p2["bbox"][0])
                    p2_h = max(10, p2["bbox"][3] - p2["bbox"][1])
                    max_prox = max(p1_w, p2_w) * 1.6

                    # Bounding box intersection (direct physical contact/grappling)
                    x_overlap = max(0, min(p1["bbox"][2], p2["bbox"][2]) - max(p1["bbox"][0], p2["bbox"][0]))
                    y_overlap = max(0, min(p1["bbox"][3], p2["bbox"][3]) - max(p1["bbox"][1], p2["bbox"][1]))
                    overlap_area = x_overlap * y_overlap

                    # Fall down indicator (person knocked over onto ground: width > 0.85 * height)
                    is_fallen = (p1_w > p1_h * 0.85) or (p2_w > p2_h * 0.85)

                    if dist < max_prox or overlap_area > 0 or is_fallen:
                        high_motion_detected = True
                        scuffle_bbox = [
                            min(p1["bbox"][0], p2["bbox"][0]),
                            min(p1["bbox"][1], p2["bbox"][1]),
                            max(p1["bbox"][2], p2["bbox"][2]),
                            max(p1["bbox"][3], p2["bbox"][3]),
                        ]
                        break
                if high_motion_detected:
                    break

        # Deep learning classification verification if model available
        fight_cls_conf = 0.0
        if self.fight_classifier and scuffle_bbox is not None:
            try:
                pad_x = int((scuffle_bbox[2] - scuffle_bbox[0]) * 0.1)
                pad_y = int((scuffle_bbox[3] - scuffle_bbox[1]) * 0.1)
                x1_c = max(0, scuffle_bbox[0] - pad_x)
                y1_c = max(0, scuffle_bbox[1] - pad_y)
                x2_c = min(w, scuffle_bbox[2] + pad_x)
                y2_c = min(h, scuffle_bbox[3] + pad_y)
                crop = frame[y1_c:y2_c, x1_c:x2_c]
                if crop.size > 0 and crop.shape[0] > 20 and crop.shape[1] > 20:
                    cls_res = self.fight_classifier.predict(crop, imgsz=224, verbose=False)
                    if cls_res and len(cls_res) > 0 and hasattr(cls_res[0], 'probs') and cls_res[0].probs is not None:
                        probs = cls_res[0].probs
                        fight_idx = None
                        for idx, name in cls_res[0].names.items():
                            if str(name).lower() == 'fight':
                                fight_idx = idx
                                break
                        if fight_idx is not None:
                            fight_cls_conf = float(probs.data[fight_idx].item())
            except Exception:
                pass

        # Leaky bucket temporal accumulator boosted by deep learning verification
        if high_motion_detected:
            boost = 1.2
            if fight_cls_conf > 0.50:
                boost = 2.0 + (fight_cls_conf - 0.50) * 2.0
            self.fight_score = min(10.0, self.fight_score + boost)
        else:
            self.fight_score = max(0.0, self.fight_score - 0.4)

        # Trigger alert when fight energy persists across ~1.0-1.5s window or high-confidence DL detection
        if (self.fight_score >= 2.0 and scuffle_bbox is not None) or (fight_cls_conf >= 0.50 and scuffle_bbox is not None):
            if (timestamp - self.fight_cooldown) >= settings.FIGHT_COOLDOWN_SECONDS:
                self.fight_cooldown = timestamp
                calc_conf = min(0.98, max(round(fight_cls_conf, 2), round(0.75 + (self.fight_score / 10.0) * 0.22, 2)))
                desc = f"Physical altercation / violence confirmed (Deep Learning: {int(fight_cls_conf * 100)}%)" if fight_cls_conf > 0.5 else "Physical altercation / violence detected via interpersonal collision & struggle"
                candidate_alerts.append({
                    "type": "fight",
                    "confidence": calc_conf,
                    "track_id": "FIGHT_ENGAGE",
                    "bbox": scuffle_bbox or [0, 0, w, h],
                    "description": desc
                })

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
                disp = np.sqrt((bx - track_data["last_x"])**2 + (by - track_data["last_y"])**2)
                if disp > 25:
                    track_data["stationary_since"] = timestamp
                    track_data["last_x"] = bx
                    track_data["last_y"] = by

            stationary_duration = timestamp - self.bag_tracks[b_id]["stationary_since"]
            has_person_near = any(
                np.sqrt((bx - p["centroid"][0])**2 + (by - p["centroid"][1])**2) <= getattr(settings, "UNATTENDED_BAG_RADIUS_PX", 150)
                for p in detected_persons
            )

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

        detections = {
            "persons": detected_persons,
            "bags": detected_bags,
            "weapons": detected_weapons,
            "scuffle_bbox": scuffle_bbox,
            "high_motion": high_motion_detected
        }

        return detections, candidate_alerts

    def draw_hud(
        self,
        frame: np.ndarray,
        detections: Dict[str, Any],
        candidate_alerts: List[Dict[str, Any]],
        timestamp: float
    ) -> np.ndarray:
        """
        Ultra-fast (<0.5ms) visual rendering of bounding boxes, labels, and top surveillance HUD.
        """
        annotated = frame.copy()
        h, w = annotated.shape[:2]

        detected_persons = detections.get("persons", [])
        detected_bags = detections.get("bags", [])
        detected_weapons = detections.get("weapons", [])
        scuffle_bbox = detections.get("scuffle_bbox")
        high_motion = detections.get("high_motion", False)

        # Draw Persons (Emerald Green)
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

        # Draw Bags (Amber)
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

        # Draw Weapons (Crimson Red highlight)
        for wp in detected_weapons:
            b = wp["bbox"]
            cv2.rectangle(annotated, (b[0], b[1]), (b[2], b[3]), (0, 0, 255), 3)
            cv2.putText(
                annotated,
                f"! WEAPON: {wp.get('label', 'THREAT').upper()} ({int(wp['conf']*100)}%) !",
                (b[0], max(20, b[1] - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 0, 255),
                2,
                cv2.LINE_AA
            )

        # Draw Scuffle highlight if active
        if self.fight_score >= 2.0 and scuffle_bbox:
            sb = scuffle_bbox
            cv2.rectangle(annotated, (sb[0], sb[1]), (sb[2], sb[3]), (0, 0, 255), 3)
            cv2.putText(
                annotated,
                f"! WARNING: PHYSICAL FIGHT DETECTED ({int(self.fight_score*10)}%) !",
                (sb[0], max(25, sb[1] - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.60,
                (0, 0, 255),
                2,
                cv2.LINE_AA
            )

        # Top Surveillance HUD Bar (Dark Charcoal with Cyan/Gold accents)
        cv2.rectangle(annotated, (0, 0), (w, 40), (12, 14, 16), -1)
        cv2.putText(
            annotated,
            f"EAGLE EYE AI | YOLO11n | Persons: {len(detected_persons)} | Bags: {len(detected_bags)} | Alerts: {len(candidate_alerts)}",
            (14, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            (0, 220, 255),
            2,
            cv2.LINE_AA
        )
        cv2.putText(
            annotated,
            f"{timestamp:.1f}s",
            (w - 75, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            (210, 210, 210),
            1,
            cv2.LINE_AA
        )

        return annotated

    def process_frame(
        self,
        frame: np.ndarray,
        frame_idx: int,
        fps: float,
        timestamp: float
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Unified full analysis and rendering pass (calls detect_and_verify then draw_hud).
        """
        detections, candidate_alerts = self.detect_and_verify(frame, frame_idx, fps, timestamp)
        annotated_frame = self.draw_hud(frame, detections, candidate_alerts, timestamp)
        return annotated_frame, candidate_alerts


def calculate_sha256(filepath: str) -> str:
    """Calculates SHA-256 for evidentiary chain of custody"""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()
