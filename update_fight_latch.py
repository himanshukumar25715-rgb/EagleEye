with open('backend/app/cv/pipeline.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. In __init__, add self.last_fight_overlay_time = 0.0 and self.last_fight_bbox = None
init_target = """        self.fight_candidate_start: Optional[float] = None
        self.fight_cooldown: float = 0.0
        self.fight_score: float = 0.0"""

init_replacement = """        self.fight_candidate_start: Optional[float] = None
        self.fight_cooldown: float = 0.0
        self.fight_score: float = 0.0
        self.last_fight_overlay_ts: float = 0.0
        self.last_fight_scuffle_bbox: Optional[List[int]] = None"""

text = text.replace(init_target, init_replacement)

# 2. When fight is detected, latch last_fight_overlay_ts to timestamp and save bbox
detect_target = """        if self.fight_score >= 3.6 or (fight_cls_conf >= 0.70 and scuffle_bbox is not None):"""

detect_replacement = """        if self.fight_score >= 2.2 or (fight_cls_conf >= 0.60 and scuffle_bbox is not None) or high_motion_detected:
            self.last_fight_overlay_ts = timestamp
            if scuffle_bbox is not None:
                self.last_fight_scuffle_bbox = scuffle_bbox

        if self.fight_score >= 3.0 or (fight_cls_conf >= 0.70 and scuffle_bbox is not None):"""

text = text.replace(detect_target, detect_replacement)

# 3. In draw_hud, keep the RED warning banner and bounding box on screen for 6 full seconds
hud_old = """        # Draw Scuffle highlight if active
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
            )"""

hud_new = """        # Latch Fight Alert HUD Overlay for at least 6.0 seconds so security guards can observe it clearly
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
            )"""

text = text.replace(hud_old, hud_new)

with open('backend/app/cv/pipeline.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated pipeline.py with persistent fight banner latch!")

