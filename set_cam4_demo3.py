import sqlite3
import os

# 1. Update SQLite DB for Source 4 -> Demo3.mp4
db_path = r'D:\sanchay\EagleEye\backend\eagle_eye.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

demo3_path = os.path.abspath(r'D:\sanchay\EagleEye\backend\storage\uploads\demo3.mp4').replace('\\', '/')
c.execute(f"UPDATE sources SET path_or_uri = '{demo3_path}', name = 'CAM-04 (Demo 3)' WHERE id = 4")
conn.commit()

c.execute("SELECT id, name, path_or_uri FROM sources WHERE id = 4")
print("Updated DB Source 4:", c.fetchone())
conn.close()

# 2. Update backend/app/main.py seed so it stays persistent
with open(r'D:\sanchay\EagleEye\backend\app\main.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace whatever Cam 4 has with demo3.mp4
import re
text = re.sub(
    r'\(4,\s*"[^"]*",\s*"[^"]*",\s*"[^"]*"\)',
    f'(4, "CAM-04 (Demo 3)", "Campus Security Zone", "{demo3_path}")',
    text
)

with open(r'D:\sanchay\EagleEye\backend\app\main.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated backend/app/main.py seed for CAM-04")

