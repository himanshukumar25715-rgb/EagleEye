import re

with open('backend/app/services/job_worker.py', encoding='utf-8') as f:
    content = f.read()

# 1. Faster target FPS for live streams (25 instead of 20)
content = content.replace(
    '        # Target playback speed: 18-20 FPS smooth real-time streaming\n        target_fps = min(float(source_fps), 20.0)',
    '        # 25 FPS for live streams, 20 FPS for recorded video\n        target_fps = min(float(source_fps), 25.0 if is_live else 20.0)'
)

# 2. Faster inference interval for live streams (every 2 frames = ~10 inferences/sec)
content = content.replace(
    '        # ML Inference interval: run YOLO every ~0.4s (2-3 inferences/sec) to keep CPU fast and smooth\n        infer_interval = max(3, int(round(source_fps * 0.4)))',
    '        # Live: infer every 2 frames (~10/sec). Recorded: every ~0.4s\n        if is_live:\n            infer_interval = 2\n        else:\n            infer_interval = max(3, int(round(source_fps * 0.4)))'
)

# 3. Slightly lower JPEG quality on live for faster encode+transfer
content = content.replace(
    '            _, buffer = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])',
    '            encode_q = 65 if is_live else 75\n            _, buffer = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), encode_q])'
)

with open('backend/app/services/job_worker.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
print("infer_interval=2:", "infer_interval = 2" in content)
print("25fps live:", "25.0 if is_live" in content)
print("encode_q:", "encode_q = 65 if is_live" in content)

