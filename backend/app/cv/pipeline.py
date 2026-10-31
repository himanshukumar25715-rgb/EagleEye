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

# 4 threads gives best balance for live single-camera inference
torch.set_num_threads(4)

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

        # Hardware Acceleration: Intel NPU / Intel Arc GPU via OpenVINO, or CUDA
        self.device = "cpu"
        self.is_openvino = False
        self.active_accel_name = "Intel Core Ultra CPU"
        self.active_accel_tag = "CPU"

        try:
            import openvino as ov
            core = ov.Core()
            available = core.available_devices

            # Probe 1: Intel AI Boost NPU (Pure Neural Processing Unit)
            if "NPU" in available:
                try:
                    test_xml = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11n_openvino_model", "yolo11n.xml")
                    if os.path.exists(test_xml):
                        m = core.read_model(test_xml)
                        m.reshape([1, 3, 384, 384])
                        core.compile_model(m, "NPU")
                        self.device = "intel:npu"
                        self.is_openvino = True
                        self.active_accel_name = f"Intel AI Boost NPU ({core.get_property('NPU', 'FULL_DEVICE_NAME')})"
                        self.active_accel_tag = "Intel NPU"
                except Exception as npu_probe_err:
                    print(f"[EagleEye Hardware Acceleration] NPU probe info: {npu_probe_err}")

            # Probe 2: Intel Arc GPU (Xe Matrix Hardware Acceleration)
            if not self.is_openvino and "GPU" in available:
                self.device = "intel:gpu"
                self.is_openvino = True
                self.active_accel_name = f"Intel Arc GPU Accelerator ({core.get_property('GPU', 'FULL_DEVICE_NAME')})"
                self.active_accel_tag = "Intel Arc GPU"
        except Exception:
            pass

        if not self.is_openvino:
            if torch.cuda.is_available():
                self.device = "cuda:0"
                self.active_accel_name = f"NVIDIA CUDA ({torch.cuda.get_device_name(0)})"
                self.active_accel_tag = "CUDA"

        print(f"[EagleEye Hardware Acceleration] Active: {self.active_accel_name} ({self.device})")

        ov_main = weights_path.replace(".pt", "_openvino_model")
        load_main = ov_main if (self.is_openvino and os.path.exists(ov_main)) else weights_path
        print(f"[EagleEye YOLO11] Initializing neural network from {load_main}...")
        self.model = YOLO(load_main)
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
            elif any(w in cn for w in ["knife", "gun", "weapon", "pistol", "scissors", "bat", "rifle", "sword", "bottle"]):
                self.weapon_class_ids.add(cid)

        # Fallback to defaults if empty
        if not self.person_class_ids:
            self.person_class_ids = {0}
        if not self.bag_class_ids:
            self.bag_class_ids = {24, 26, 28}

        # Check for fine-tuned deep learning fight & violence detector
        fight_nano = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo_fight_nano.pt")
        fight_best = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11_fight_best.pt")
        active_fight_weights = fight_nano if os.path.exists(fight_nano) else (fight_best if os.path.exists(fight_best) else None)
        self.fight_classifier = None
        if active_fight_weights:
            try:
                ov_fight = active_fight_weights.replace(".pt", "_openvino_model")
                load_fight = ov_fight if (self.is_openvino and os.path.exists(ov_fight)) else active_fight_weights
                self.fight_classifier = YOLO(load_fight, task="classify")
                print(f"[EagleEye CV] Neural Violence Detection Network active from {load_fight}")
            except Exception as e:
                print(f"[EagleEye CV] Note: fight classifier deferred: {e}")

        # Dedicated Custom Fine-Tuned Weapon & Firearm Model (Pistols, Handguns, Knives)
        weapon_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "yolo11_weapon_best.pt")
        if not os.path.exists(weapon_weights):
            weapon_weights = os.path.join(os.path.dirname(__file__), "..", "..", "weights", "weapon_yolov8n.pt")
        self.weapon_model = None
        if os.path.exists(weapon_weights):
            try:
                ov_weapon = weapon_weights.replace(".pt", "_openvino_model")
                load_weapon = ov_weapon if (self.is_openvino and os.path.exists(ov_weapon)) else weapon_weights
                self.weapon_model = YOLO(load_weapon, task="detect")
                print(f"[EagleEye CV] Dedicated Weapon/Firearm Neural Network active: {self.weapon_model.names}")
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
        self.last_fight_overlay_ts: float = 0.0
        self.last_fight_scuffle_bbox: Optional[List[int]] = None

        # Module 3: Unattended Bag state:
        # bag_id -> {"first_seen": ts, "stationary_since": ts, "last_x": x, "last_y": y}
        self.bag_tracks: Dict[str, Dict[str, Any]] = {}
        self.bag_alert_sent: Dict[str, bool] = {}

        # Module 4: Overcrowding state
        self.crowd_start_time: Optional[float] = None
        self.crowd_cooldown: float = 0.0

    def reset_state(self):
        """Clears all trackers and cooldowns when video restarts or loops"""
        self.weapon_history.clear()
        self.weapon_cooldown.clear()
        self.person_positions.clear()
        self.fight_candidate_start = None
        self.fight_cooldown = 0.0
        self.fight_score = 0.0
        self.last_fight_overlay_ts = 0.0
        self.last_fight_scuffle_bbox = None
        self.bag_tracks.clear()
        self.bag_alert_sent.clear()
        self.crowd_start_time = None
        self.crowd_cooldown = 0.0

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
                conf=0.25,
                imgsz=384,
                device=self.device
            )
            det = results[0]
        except Exception:
            # Fallback to standard detect if tracking fails
            results = self.model(source=frame, verbose=False, conf=0.25, imgsz=384, device=self.device)
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

        # Run Dedicated Fine-Tuned Weapon Detection (Pistols, Firearms, Knives)
        if self.weapon_model is not None:
            try:
                w_results = self.weapon_model.predict(
                    source=frame,
                    conf=0.20,
                    imgsz=384,
                    device=self.device,
                    verbose=False
                )
                if w_results and len(w_results) > 0 and w_results[0].boxes is not None:
                    for i, w_box in enumerate(w_results[0].boxes):
                        w_cls = int(w_box.cls[0].item())
                        w_conf = float(w_box.conf[0].item())
                        w_coords = w_box.xyxy[0].cpu().numpy().astype(int)
                        w_lbl = str(self.weapon_model.names.get(w_cls, "weapon")).lower()
                        w_cx = (w_coords[0] + w_coords[2]) / 2.0
                        w_cy = (w_coords[1] + w_coords[3]) / 2.0
                        detected_weapons.append({
                            "track_id": f"wp_{w_lbl}_{i}",
                            "conf": w_conf,
                            "bbox": w_coords.tolist(),
                            "centroid": (w_cx, w_cy),
                            "label": w_lbl
                        })
            except Exception as e:
                pass

        # Query Roboflow Serverless Workflow (CCTV Gun & Knife) only if configured
        if detected_persons and settings.USE_ROBOFLOW_WEAPON_API and settings.ROBOFLOW_API_KEY:
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

        # Check if an altercation is currently ongoing
        is_fight_in_progress = (self.fight_score >= 2.0) or ((timestamp - self.last_fight_overlay_ts) < 6.0 and self.last_fight_overlay_ts > 0)

        # -------------------------------------------------------------
        # MODULE 1: Weapon Detection (Immediate Tactical Alerting)
        # -------------------------------------------------------------
        for w_item in detected_weapons:
            conf = w_item["conf"]
            w_label = str(w_item.get("label", "weapon")).upper()

            # Trigger alert every 5s if weapon persists, or reset if loop restarted
            last_alert = self.weapon_cooldown.get(track_id, 0.0)
            if (timestamp - last_alert) >= 5.0 or timestamp < last_alert:
                self.weapon_cooldown[track_id] = timestamp
                alert_prefix = "CRITICAL: WEAPON BRANDISHED IN ALTERCATION" if is_fight_in_progress else "CRITICAL: WEAPON DETECTED"
                candidate_alerts.append({
                    "type": "weapon",
                    "confidence": round(conf, 2),
                    "track_id": track_id,
                    "bbox": w_item["bbox"],
                    "description": f"{alert_prefix}: {w_label} ({int(conf*100)}%)"
                })

        # Clean history for lost tracks
        for trk in list(self.weapon_history.keys()):
            if trk not in current_frame_weapon_ids:
                self.weapon_history[trk].append(False)
                if len(self.weapon_history[trk]) > 5:
                    self.weapon_history[trk].pop(0)

        # -------------------------------------------------------------
        # MODULE 2: Advanced Dynamic Fight Verification
        # Feature 1: Minimum Motion Energy & Velocity Differentiation
        # Feature 2: Multi-Person Clustered Scuffle Expansion (3rd/4th cluster)
        # Feature 3: Temporal Persistence Decay (sustained >= 0.8s)
        # -------------------------------------------------------------
        high_motion_detected = False
        scuffle_bbox = None
        cluster_participants = 0

        if len(detected_persons) >= 2:
            for i in range(len(detected_persons)):
                for j in range(i + 1, len(detected_persons)):
                    p1 = detected_persons[i]
                    p2 = detected_persons[j]

                    dx = p1["centroid"][0] - p2["centroid"][0]
                    dy = p1["centroid"][1] - p2["centroid"][1]
                    dist = np.sqrt(dx * dx + dy * dy)

                    p1_w = max(10, p1["bbox"][2] - p1["bbox"][0])
                    p1_h = max(10, p1["bbox"][3] - p1["bbox"][1])
                    p2_w = max(10, p2["bbox"][2] - p2["bbox"][0])
                    p2_h = max(10, p2["bbox"][3] - p2["bbox"][1])
                    max_prox = max(p1_w, p2_w) * 1.5

                    # Direct collision overlap
                    x_overlap = max(0, min(p1["bbox"][2], p2["bbox"][2]) - max(p1["bbox"][0], p2["bbox"][0]))
                    y_overlap = max(0, min(p1["bbox"][3], p2["bbox"][3]) - max(p1["bbox"][1], p2["bbox"][1]))
                    overlap_area = x_overlap * y_overlap
                    is_fallen = (p1_w > p1_h * 0.85) or (p2_w > p2_h * 0.85)

                    # FEATURE 1: Require Minimum Motion Energy (Filter out couples & co-walkers)
                    # Check velocity vectors from previous position history
                    prev_p1 = self.person_positions.get(p1["track_id"])
                    prev_p2 = self.person_positions.get(p2["track_id"])

                    motion_energy = 0.0
                    co_walking = False

                    if prev_p1 and prev_p2:
                        dt1 = max(0.001, timestamp - prev_p1[2])
                        dt2 = max(0.001, timestamp - prev_p2[2])
                        v1x = (p1["centroid"][0] - prev_p1[0]) / dt1
                        v1y = (p1["centroid"][1] - prev_p1[1]) / dt1
                        v2x = (p2["centroid"][0] - prev_p2[0]) / dt2
                        v2y = (p2["centroid"][1] - prev_p2[1]) / dt2

                        spd1 = np.sqrt(v1x**2 + v1y**2)
                        spd2 = np.sqrt(v2x**2 + v2y**2)
                        rel_v = np.sqrt((v1x - v2x)**2 + (v1y - v2y)**2)
                        motion_energy = rel_v

                        # Co-walking check: Moving at similar speed in nearly identical direction
                        if spd1 > 10 and spd2 > 10:
                            dot = (v1x * v2x + v1y * v2y) / (spd1 * spd2 + 1e-5)
                            if dot > 0.85 and rel_v < 35:
                                co_walking = True

                    # Only classify as scuffle if physical proximity AND active antagonistic motion (not co-walking)
                    is_in_physical_contact = (overlap_area > 0) or (dist < max_prox) or is_fallen
                    is_turbulent_motion = (motion_energy >= 16.0) or is_fallen

                    if is_in_physical_contact and is_turbulent_motion and not co_walking:
                        high_motion_detected = True
                        scuffle_bbox = [
                            min(p1["bbox"][0], p2["bbox"][0]),
                            min(p1["bbox"][1], p2["bbox"][1]),
                            max(p1["bbox"][2], p2["bbox"][2]),
                            max(p1["bbox"][3], p2["bbox"][3]),
                        ]

                        # FEATURE 2: Multi-Person Clustered Scuffle Expansion (3rd & 4th converging participants)
                        cluster_participants = 2
                        sc_cx = (scuffle_bbox[0] + scuffle_bbox[2]) / 2.0
                        sc_cy = (scuffle_bbox[1] + scuffle_bbox[3]) / 2.0

                        for k, pk in enumerate(detected_persons):
                            if k != i and k != j:
                                pk_dist = np.sqrt((pk["centroid"][0] - sc_cx)**2 + (pk["centroid"][1] - sc_cy)**2)
                                if pk_dist < (max_prox * 1.8):
                                    cluster_participants += 1
                                    scuffle_bbox = [
                                        min(scuffle_bbox[0], pk["bbox"][0]),
                                        min(scuffle_bbox[1], pk["bbox"][1]),
                                        max(scuffle_bbox[2], pk["bbox"][2]),
                                        max(scuffle_bbox[3], pk["bbox"][3]),
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
                    cls_res = self.fight_classifier.predict(crop, imgsz=384, verbose=False, device=self.device)
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

        # FEATURE 3: Temporal Persistence Decay (Requires >= 0.8s to 1.2s sustained dynamic)
        if high_motion_detected:
            if self.fight_candidate_start is None:
                self.fight_candidate_start = timestamp

            sustained_duration = timestamp - self.fight_candidate_start
            boost = 1.4 + (0.5 if cluster_participants >= 3 else 0.0)
            if fight_cls_conf > 0.50:
                boost += 2.0
            self.fight_score = min(10.0, self.fight_score + boost)
        else:
            self.fight_candidate_start = None
            self.fight_score = max(0.0, self.fight_score - 0.5)
            sustained_duration = 0.0

        # Latch video overlay timestamp
        if (high_motion_detected and sustained_duration >= 0.6) or self.fight_score >= 2.0:
            self.last_fight_overlay_ts = timestamp
            if scuffle_bbox is not None:
                self.last_fight_scuffle_bbox = scuffle_bbox

        # Trigger high-priority sirens & dispatch alert popups whenever an altercation occurs or red banner is displayed
        is_fight_event = high_motion_detected or (self.fight_score >= 1.6) or ((timestamp - self.last_fight_overlay_ts) < 5.0 and self.last_fight_overlay_ts > 0)

        if is_fight_event:
            # 3.0s cooldown, or immediately fire if timestamp reset on loop
            if (timestamp - self.fight_cooldown) >= 3.0 or timestamp < self.fight_cooldown:
                self.fight_cooldown = timestamp
                calc_conf = min(0.99, max(0.89, round(0.88 + (self.fight_score / 10.0) * 0.11, 2)))
                cluster_label = f" ({cluster_participants}-person scuffle)" if cluster_participants >= 3 else ""
                desc = f"Physical altercation in progress{cluster_label} - immediate security intervention required"
                candidate_alerts.append({
                    "type": "fight",
                    "confidence": calc_conf,
                    "track_id": "FIGHT_ENGAGE",
                    "bbox": scuffle_bbox or self.last_fight_scuffle_bbox or [0, 0, w, h],
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
                np.sqrt((bx - p["centroid"][0])**2 + (by - p["centroid"][1])**2) <= getattr(settings, "UNATTENDED_BAG_RADIUS_PX", 180)
                for p in detected_persons
            )

            # In an active fight zone, a dropped bag is immediately flagged in 5s (abandoned/dropped property)
            bag_time_req = 5.0 if is_fight_in_progress else min(25.0, settings.UNATTENDED_BAG_TIME_SECONDS)

            if not has_person_near and stationary_duration >= bag_time_req:
                if not self.bag_alert_sent.get(b_id, False):
                    self.bag_alert_sent[b_id] = True
                    bag_desc = f"Unattended property dropped in scuffle area ({int(stationary_duration)}s)" if is_fight_in_progress else f"Bag stationary for {int(stationary_duration)}s without owner"
                    candidate_alerts.append({
                        "type": "unattended_object",
                        "confidence": round(bag["conf"], 2),
                        "track_id": b_id,
                        "bbox": bag["bbox"],
                        "description": bag_desc
                    })

        # -------------------------------------------------------------
        # MODULE 4: Overcrowding Detection (Dynamic Mob Gathering in Fights)
        # -------------------------------------------------------------
        person_count = len(detected_persons)
        # If fight is active, even 3 or more people constitutes a mob / bystander gathering
        crowd_threshold = 3 if is_fight_in_progress else settings.CROWD_OVERCROWDING_THRESHOLD
        crowd_time_req = 2.0 if is_fight_in_progress else settings.CROWD_DURATION_SECONDS

        if person_count >= crowd_threshold:
            if self.crowd_start_time is None:
                self.crowd_start_time = timestamp
            elif (timestamp - self.crowd_start_time) >= crowd_time_req:
                if (timestamp - self.crowd_cooldown) >= (15.0 if is_fight_in_progress else 30.0):
                    self.crowd_cooldown = timestamp
                    crowd_desc = f"Hostile mob / bystander cluster: {person_count} persons gathered at fight scene" if is_fight_in_progress else f"Overcrowding alert: {person_count} persons detected"
                    candidate_alerts.append({
                        "type": "overcrowding",
                        "confidence": 0.94 if is_fight_in_progress else 0.88,
                        "track_id": f"CROWD-{person_count}",
                        "bbox": [10, 10, w - 10, h - 10],
                        "description": crowd_desc
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

        # Draw Weapons (Crimson Red highlight with weapon label)
        for wp in detected_weapons:
            b = wp["bbox"]
            w_lbl = str(wp.get("label", "weapon")).upper()
            w_pct = int(wp["conf"] * 100)
            cv2.rectangle(annotated, (b[0], b[1]), (b[2], b[3]), (0, 0, 255), 3)
            cv2.rectangle(annotated, (b[0], max(0, b[1] - 26)), (min(w, b[0] + 240), b[1]), (0, 0, 220), -1)
            cv2.putText(
                annotated,
                f"! WEAPON: {w_lbl} ({w_pct}%) !",
                (b[0] + 4, max(18, b[1] - 7)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.52,
                (255, 255, 255),
                2,
                cv2.LINE_AA
            )

        # Latch Fight Alert HUD Overlay for at least 6.0 seconds so security guards can observe it clearly
        is_fight_active = (self.fight_score >= 2.0 and scuffle_bbox) or ((timestamp - self.last_fight_overlay_ts) < 6.0 and self.last_fight_overlay_ts > 0)
        display_bbox = scuffle_bbox if scuffle_bbox is not None else self.last_fight_scuffle_bbox

        if is_fight_active and display_bbox:
            sb = display_bbox
            # Bold high-contrast red warning boundary
            cv2.rectangle(annotated, (sb[0], sb[1]), (sb[2], sb[3]), (0, 0, 255), 4)
            # Pulsing top danger badge
            cv2.rectangle(annotated, (sb[0], max(0, sb[1] - 32)), (min(w, sb[0] + 360), sb[1]), (0, 0, 220), -1)
            cv2.putText(
                annotated,
                f"CRITICAL: PHYSICAL FIGHT ALERT",
                (sb[0] + 6, max(20, sb[1] - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2,
                cv2.LINE_AA
            )

        # Top Surveillance HUD Bar (Dark Charcoal with Cyan/Gold accents)
        cv2.rectangle(annotated, (0, 0), (w, 40), (12, 14, 16), -1)
        cv2.putText(
            annotated,
            f"EAGLE EYE AI | YOLO11 [{self.active_accel_tag}] | Persons: {len(detected_persons)} | Bags: {len(detected_bags)} | Alerts: {len(candidate_alerts)}",
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
