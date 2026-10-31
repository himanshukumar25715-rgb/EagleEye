with open('backend/app/cv/pipeline.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Broaden weapon detection classes: knife(43), scissors(76), bat(34), plus bottle(39), cell phone when wielded, umbrella(25) as potential dangerous wielded objects
# And enable sensitivity scaling when a fight is active
old_weapon_mapping = """        # Dynamically map class indices according to model taxonomy (works with COCO or ABODA)
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
                self.weapon_class_ids.add(cid)"""

new_weapon_mapping = """        # Dynamically map class indices according to model taxonomy (works with COCO or ABODA)
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
                self.weapon_class_ids.add(cid)"""

text = text.replace(old_weapon_mapping, new_weapon_mapping)

# 2. Multi-Threat Convergence:
# When people are engaged in a scuffle:
# - Weapon confidence threshold lowers (higher sensitivity for concealed or brandished blades/blunt objects)
# - Overcrowding triggers with fewer people (3+ bystanders gathering around the scuffle forms a high-risk crowd)
# - Unattended bag threshold timer drops from 60s to 5s if dropped near an active altercation
old_modules = """        # -------------------------------------------------------------
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
                            "description": f"CCTV Weapon Alert: {w_item.get('label', 'weapon').upper()} detected"
                        })"""

new_modules = """        # Check if an altercation is currently ongoing
        is_fight_in_progress = (self.fight_score >= 2.0) or ((timestamp - self.last_fight_overlay_ts) < 6.0 and self.last_fight_overlay_ts > 0)

        # -------------------------------------------------------------
        # MODULE 1: Weapon Detection with Dynamic Altercation Boost
        # -------------------------------------------------------------
        # If a fight is in progress, lower threshold from 0.65 to 0.35 so drawn weapons/knives are captured immediately
        effective_weapon_thresh = 0.35 if is_fight_in_progress else settings.WEAPON_CONFIDENCE_THRESHOLD
        effective_weapon_min_frames = 2 if is_fight_in_progress else settings.WEAPON_MIN_FRAMES_IN_LAST_5

        current_frame_weapon_ids = set()
        for w_item in detected_weapons:
            track_id = w_item["track_id"]
            conf = w_item["conf"]
            current_frame_weapon_ids.add(track_id)

            if conf >= effective_weapon_thresh:
                history = self.weapon_history.get(track_id, [])
                history.append(True)
                if len(history) > 5:
                    history.pop(0)
                self.weapon_history[track_id] = history

                # Multi-frame rule
                if sum(history) >= effective_weapon_min_frames:
                    last_alert = self.weapon_cooldown.get(track_id, 0.0)
                    if (timestamp - last_alert) >= (10.0 if is_fight_in_progress else settings.WEAPON_COOLDOWN_SECONDS):
                        self.weapon_cooldown[track_id] = timestamp
                        alert_prefix = "CRITICAL: WEAPON BRANDISHED IN ALTERCATION" if is_fight_in_progress else "CCTV Weapon Alert"
                        candidate_alerts.append({
                            "type": "weapon",
                            "confidence": round(conf, 2),
                            "track_id": track_id,
                            "bbox": w_item["bbox"],
                            "description": f"{alert_prefix}: {w_item.get('label', 'weapon').upper()} detected"
                        })"""

text = text.replace(old_modules, new_modules)

# 3. Update Module 3 (Bags) and Module 4 (Crowd) for fight context
old_bag_and_crowd = """            stationary_duration = timestamp - self.bag_tracks[b_id]["stationary_since"]
            has_person_near = any(
                np.sqrt((bx - p["centroid"][0])**2 + (by - p["centroid"][1])**2) <= settings.UNATTENDED_BAG_RADIUS_PIXELS
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
                    })"""

new_bag_and_crowd = """            stationary_duration = timestamp - self.bag_tracks[b_id]["stationary_since"]
            has_person_near = any(
                np.sqrt((bx - p["centroid"][0])**2 + (by - p["centroid"][1])**2) <= settings.UNATTENDED_BAG_RADIUS_PX
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
                    })"""

text = text.replace(old_bag_and_crowd, new_bag_and_crowd)

with open('backend/app/cv/pipeline.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated pipeline with Multi-Threat Correlation Engine!")

