with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = '''        # 4 Core Camera Sources with realistic CCTV footage
        sample_cameras = [
            (1, "Main Entrance Gate 1", "Campus Gate 1 - North Boundary", "storage/uploads/sample_gate.mp4"),
            (2, "North Perimeter Walkway", "North Walkway - Sector B", "storage/uploads/sample_corridor.mp4"),
            (3, "Hostel Block A Lobby", "Hostel Block A - Ground Floor", "storage/uploads/sample_hostel.mp4"),
            (4, "Dining Hall Corridor", "Central Mess and Dining Wing", "storage/uploads/sample_hall.mp4"),
        ]'''

new_block = '''        # 4 Core Camera Sources configured per user requirements:
        # CAM-01: Default live phone camera
        # CAM-02: Submitted fight incident detection video
        # CAM-03 & CAM-04: Default campus surveillance videos
        sample_cameras = [
            (1, "CAM-01 (Live Phone Camera)", "Live Mobile Demo Stream", "http://192.168.137.22:8080/video"),
            (2, "CAM-02 (Fight Video)", "North Perimeter Walkway", "storage/uploads/fight_0001.mp4"),
            (3, "Hostel Block A Lobby", "Hostel Block A - Ground Floor", "storage/uploads/sample_hostel.mp4"),
            (4, "Dining Hall Corridor", "Central Mess and Dining Wing", "storage/uploads/sample_hall.mp4"),
        ]'''

if old_block in text:
    text = text.replace(old_block, new_block)
    print("Replaced sample_cameras in main.py")
else:
    print("Old block not matched in main.py, let's normalize newlines")
    text = text.replace(old_block.replace('\n', '\r\n'), new_block.replace('\n', '\r\n'))
    if "CAM-01 (Live Phone Camera)" in text:
        print("Replaced with CRLF!")
    else:
        print("Still not matched")

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("backend/app/main.py updated!")

