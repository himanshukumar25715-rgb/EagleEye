#!/usr/bin/env python3
"""
create_splits.py - Sequences Splitter & YOLO Dataset Structure Builder

Splits extracted ABODA video frames by video sequence to eliminate data leakage:
- Train : video1, video2, video3, video5, video6, video7, video9
- Val   : video8, video10
- Test  : video4, video11
"""

import os
import shutil
import glob
import yaml

TRAIN_VIDEOS = ["video1", "video2", "video3", "video5", "video6", "video7", "video9"]
VAL_VIDEOS = ["video8", "video10"]
TEST_VIDEOS = ["video4", "video11"]

def build_yolo_splits(
    extracted_dir: str = "datasets/aboda_extracted",
    output_yolo_dir: str = "datasets/aboda_yolo"
):
    print(f"Building YOLO dataset splits in {output_yolo_dir}...")

    splits = {
        "train": TRAIN_VIDEOS,
        "val": VAL_VIDEOS,
        "test": TEST_VIDEOS
    }

    # Create directories
    for split in splits.keys():
        os.makedirs(os.path.join(output_yolo_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(output_yolo_dir, "labels", split), exist_ok=True)

    counts = {"train": 0, "val": 0, "test": 0}

    for split, video_list in splits.items():
        dst_img_dir = os.path.join(output_yolo_dir, "images", split)
        for vid in video_list:
            src_vid_dir = os.path.join(extracted_dir, vid)
            if not os.path.exists(src_vid_dir):
                continue
            images = glob.glob(os.path.join(src_vid_dir, "*.jpg"))
            for img_path in images:
                dst_path = os.path.join(dst_img_dir, os.path.basename(img_path))
                if not os.path.exists(dst_path):
                    shutil.copy2(img_path, dst_path)
                counts[split] += 1

    print("Splits created successfully:")
    print(f"  Train : {counts['train']} frames (Videos: {TRAIN_VIDEOS})")
    print(f"  Val   : {counts['val']} frames (Videos: {VAL_VIDEOS})")
    print(f"  Test  : {counts['test']} frames (Videos: {TEST_VIDEOS})")

    # Generate data.yaml with absolute/relative path
    abs_yolo_dir = os.path.abspath(output_yolo_dir).replace("\\", "/")
    data_yaml_content = {
        "path": abs_yolo_dir,
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {
            0: "abandoned_object",
            1: "person",
            2: "luggage_bag"
        }
    }

    yaml_path = os.path.join(output_yolo_dir, "data.yaml")
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(data_yaml_content, f, sort_keys=False)

    # Also save in root as data.yaml for convenience
    with open("data.yaml", "w", encoding="utf-8") as f:
        yaml.dump(data_yaml_content, f, sort_keys=False)

    print(f"Generated data.yaml at {yaml_path} and ./data.yaml")

if __name__ == "__main__":
    build_yolo_splits()

