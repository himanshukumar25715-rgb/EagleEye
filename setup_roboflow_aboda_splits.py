#!/usr/bin/env python3
"""
setup_roboflow_aboda_splits.py

Partitions the 553 labeled images & text labels from aboda-dataset.v1i.yolov11
into sequence-based train / val / test splits to prevent data leakage:
- Train : video1, video2, video3, video5, video6, video7 (354 images, ~64%)
- Val   : video8, video9, video10 (149 images, ~27%)
- Test  : video4, video11 (50 images, ~9%)
"""

import os
import shutil
import glob
import yaml

TRAIN_SEQS = ["video1", "video2", "video3", "video5", "video6", "video7"]
VAL_SEQS = ["video8", "video9", "video10"]
TEST_SEQS = ["video4", "video11"]

def partition_dataset(
    src_dir: str = "aboda-dataset.v1i.yolov11/train",
    dst_dir: str = "datasets/aboda_trained_yolo"
):
    print("=" * 70)
    print("Partitioning Labeled ABODA Dataset by Sequence (Zero Data Leakage)")
    print("=" * 70)

    splits = {
        "train": TRAIN_SEQS,
        "val": VAL_SEQS,
        "test": TEST_SEQS
    }

    for split in splits.keys():
        os.makedirs(os.path.join(dst_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(dst_dir, "labels", split), exist_ok=True)

    img_paths = glob.glob(os.path.join(src_dir, "images", "*.jpg"))
    print(f"Total labeled images found: {len(img_paths)}")

    counts = {"train": 0, "val": 0, "test": 0}

    for img_p in img_paths:
        base_name = os.path.basename(img_p)
        txt_name = os.path.splitext(base_name)[0] + ".txt"
        txt_p = os.path.join(src_dir, "labels", txt_name)

        # Identify sequence prefix
        seq = base_name.split("_mp4")[0] if "_mp4" in base_name else base_name.split("_")[0]

        target_split = "train"
        if seq in VAL_SEQS:
            target_split = "val"
        elif seq in TEST_SEQS:
            target_split = "test"

        # Copy image and label
        shutil.copy2(img_p, os.path.join(dst_dir, "images", target_split, base_name))
        if os.path.exists(txt_p):
            shutil.copy2(txt_p, os.path.join(dst_dir, "labels", target_split, txt_name))
        else:
            # Empty label file for negative/background
            open(os.path.join(dst_dir, "labels", target_split, txt_name), "w").close()

        counts[target_split] += 1

    print("\nSplits Partition Summary:")
    print(f"  [TRAIN] {counts['train']} images (Sequences: {TRAIN_SEQS})")
    print(f"  [VAL]   {counts['val']} images (Sequences: {VAL_SEQS})")
    print(f"  [TEST]  {counts['test']} images (Sequences: {TEST_SEQS})")

    # Generate data.yaml with absolute/relative path
    abs_dst = os.path.abspath(dst_dir).replace("\\", "/")
    data_yaml = {
        "path": abs_dst,
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": 4,
        "names": {
            0: "backpack",
            1: "bag",
            2: "carrybag",
            3: "person"
        }
    }

    yaml_path = os.path.join(dst_dir, "data.yaml")
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(data_yaml, f, sort_keys=False)

    print(f"\nGenerated data.yaml at: {yaml_path}")
    print("=" * 70)
    return yaml_path

if __name__ == "__main__":
    partition_dataset()

