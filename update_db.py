import sqlite3
import os

db_path = r'D:\sanchay\EagleEye\backend\eagle_eye.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# 1. Update Source 1 -> Phone camera
c.execute(
    "UPDATE sources SET path_or_uri = 'http://192.168.137.22:8080/video', name = 'CAM-01 (Phone Live)' WHERE id = 1"
)

# 2. Update Source 2 -> fight_0001.mp4
fight_file = os.path.abspath(r'D:\sanchay\EagleEye\backend\storage\uploads\fight_0001.mp4').replace('\\', '/')
c.execute(
    f"UPDATE sources SET path_or_uri = '{fight_file}', name = 'CAM-02 (Fight Video)' WHERE id = 2"
)

# 3. Source 3 and 4 -> sample videos
c.execute("UPDATE sources SET path_or_uri = 'storage/uploads/sample_hostel.mp4' WHERE id = 3")
c.execute("UPDATE sources SET path_or_uri = 'storage/uploads/sample_hall.mp4' WHERE id = 4")

conn.commit()

c.execute("SELECT id, name, path_or_uri FROM sources")
for row in c.fetchall():
    print(row)

conn.close()
print("DATABASE PERMANENTLY UPDATED!")

