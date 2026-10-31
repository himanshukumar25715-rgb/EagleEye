with open('backend/app/services/job_worker.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace get_live_frame_generator
old_target = """def get_live_frame_generator(job_id: int) -> Generator[bytes, None, None]:
    \"\"\"Generates MJPEG boundary frames for the web viewer in real-time\"\"\"
    placeholder = None
    while True:
        frame_bytes = latest_job_frames.get(job_id)
        if frame_bytes:
            yield (b"--frame\\r\\n"
                   b"Content-Type: image/jpeg\\r\\n\\r\\n" + frame_bytes + b"\\r\\n")
        else:
            if placeholder is None:
                import numpy as np
                img = np.zeros((360, 640, 3), dtype=np.uint8)
                img[:] = (18, 18, 18)
                _, buf = cv2.imencode(".jpg", img)
                placeholder = buf.tobytes()
            yield (b"--frame\\r\\n"
                   b"Content-Type: image/jpeg\\r\\n\\r\\n" + placeholder + b"\\r\\n")
        time.sleep(0.02)  # fast stream loop"""

new_target = """def get_live_frame_generator(job_id: int) -> Generator[bytes, None, None]:
    \"\"\"Generates MJPEG boundary frames for the web viewer in real-time\"\"\"
    waited = 0.0
    while job_id not in latest_job_frames:
        time.sleep(0.1)
        waited += 0.1
        if waited > 2.0:
            # Yield nothing so stream terminates and frontend displays clean NO CAMERA
            return

    missed_count = 0
    while True:
        frame_bytes = latest_job_frames.get(job_id)
        if frame_bytes:
            missed_count = 0
            yield (b"--frame\\r\\n"
                   b"Content-Type: image/jpeg\\r\\n\\r\\n" + frame_bytes + b"\\r\\n")
        else:
            missed_count += 1
            if missed_count > 15:  # ~0.3s without frames -> stream stopped
                return
        time.sleep(0.02)  # fast stream loop"""

if old_target in text:
    text = text.replace(old_target, new_target)
    print("Replaced get_live_frame_generator successfully!")
else:
    print("Exact old_target not found.")

with open('backend/app/services/job_worker.py', 'w', encoding='utf-8') as f:
    f.write(text)

