import re

with open('backend/app/services/job_worker.py', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Generator streaming sleep
text = text.replace('time.sleep(0.05)  # ~20 fps streaming', 'time.sleep(0.02)  # fast stream loop')

# 2. Target FPS
text = text.replace('target_fps = min(float(source_fps), 25.0 if is_live else 20.0)', 'target_fps = min(float(source_fps), 28.0)')

# 3. Downscale large frames to 640px wide for instant MJPEG network delivery
old_block = """            # Store latest frame buffer for live MJPEG streaming
            encode_q = 65 if is_live else 75
            _, buffer = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), encode_q])
            latest_job_frames[job_id] = buffer.tobytes()"""

new_block = """            # Store latest frame buffer for ultra-fast, unlagging MJPEG streaming
            h_f, w_f = annotated_frame.shape[:2]
            if w_f > 640:
                scale = 640.0 / w_f
                preview_frame = cv2.resize(annotated_frame, (640, int(h_f * scale)), interpolation=cv2.INTER_NEAREST)
            else:
                preview_frame = annotated_frame

            encode_q = 55 if is_live else 65
            _, buffer = cv2.imencode(".jpg", preview_frame, [int(cv2.IMWRITE_JPEG_QUALITY), encode_q])
            latest_job_frames[job_id] = buffer.tobytes()"""

if old_block in text:
    text = text.replace(old_block, new_block)
    print("Replaced streaming block")
else:
    print("Old block not found, searching with regex...")
    text = re.sub(
        r'latest_job_frames\[job_id\]\s*=\s*buffer\.tobytes\(\)',
        '''# stream
            latest_job_frames[job_id] = buffer.tobytes()''',
        text
    )

with open('backend/app/services/job_worker.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("job_worker.py written successfully")

