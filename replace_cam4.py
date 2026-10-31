import sqlite3

# Update DB
conn = sqlite3.connect('backend/eagle_eye.db')
c = conn.cursor()
c.execute("UPDATE sources SET path_or_uri = 'storage/uploads/sample_corridor.mp4', name = 'Dining Hall Walkway' WHERE id = 4")
conn.commit()
conn.close()
print("Updated source 4 in DB")

# Update main.py seed so it persists
with open('backend/app/main.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '(4, "Dining Hall Corridor", "Central Mess and Dining Wing", "storage/uploads/sample_hall.mp4")',
    '(4, "Dining Hall Walkway", "Dining Wing Walkway", "storage/uploads/sample_corridor.mp4")'
)

with open('backend/app/main.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated backend/app/main.py seed data")

