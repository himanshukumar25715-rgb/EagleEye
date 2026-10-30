#!/usr/bin/env python3
"""
validate_dataset.py - Dataset Integrity & Annotation Validation Tool for YOLO11

Checks:
1. Matching image and label file pairs.
2. Valid YOLO class IDs against data.yaml.
3. Coordinate normalization (x, y, w, h strictly in range [0, 1]).
4. Degenerate / zero-area or out-of-bounds bounding boxes.
5. Image decodability and corruption.
6. Data leakage between train, val, and test splits (sequence overlap).
7. Missing annotations / unannotated frames.
8. Class imbalance and distribution summary.
9. Produces a comprehensive validation report.
"""

import os
import cv2
import yaml
import glob
import argparse
from typing import Dict, List, Any, Set, Tuple


def validate_yolo_dataset(dataset_dir: str, data_yaml_path: str) -> Dict[str, Any]:
    report: Dict[str, Any] = {
        "status": "PASS",
        "errors": [],
        "warnings": [],
        "summary": {},
        "splits": {}
    }

    if not os.path.exists(data_yaml_path):
        report["status"] = "FAIL"
        report["errors"].append(f"data.yaml not found at: {data_yaml_path}")
        return report

    try:
        with open(data_yaml_path, "r", encoding="utf-8") as f:
            yaml_config = yaml.safe_load(f)
    except Exception as e:
        report["status"] = "FAIL"
        report["errors"].append(f"Failed to parse data.yaml: {str(e)}")
        return report

    names = yaml_config.get("names", {})
    if isinstance(names, list):
        class_names = {i: name for i, name in enumerate(names)}
    elif isinstance(names, dict):
        class_names = {int(k): v for k, v in names.items()}
    else:
        class_names = {}

    report["class_taxonomy"] = class_names

    # Check splits
    splits = ["train", "val", "test"]
    sequence_splits: Dict[str, Set[str]] = {"train": set(), "val": set(), "test": set()}
    class_counts: Dict[str, int] = {c: 0 for c in class_names.values()}

    total_images = 0
    total_labels = 0
    total_boxes = 0
    missing_labels_count = 0

    for split in splits:
        img_dir = os.path.join(dataset_dir, "images", split)
        lbl_dir = os.path.join(dataset_dir, "labels", split)

        split_images = glob.glob(os.path.join(img_dir, "*.*"))
        split_images = [img for img in split_images if img.lower().endswith(('.jpg', '.jpeg', '.png'))]
        split_labels = glob.glob(os.path.join(lbl_dir, "*.txt"))

        split_stat = {
            "image_count": len(split_images),
            "label_count": len(split_labels),
            "boxes_count": 0,
            "corrupt_images": 0,
            "invalid_boxes": 0,
            "unannotated_frames": 0
        }

        # Track video sequences in this split
        for img_path in split_images:
            base = os.path.basename(img_path)
            seq_id = base.split("_f")[0] if "_f" in base else base.split("_")[0]
            sequence_splits[split].add(seq_id)

            # Check image integrity
            im = cv2.imread(img_path)
            if im is None:
                split_stat["corrupt_images"] += 1
                report["errors"].append(f"Corrupt image cannot be decoded: {img_path}")
                continue

            # Check matching label
            label_name = os.path.splitext(base)[0] + ".txt"
            label_path = os.path.join(lbl_dir, label_name)

            if not os.path.exists(label_path):
                split_stat["unannotated_frames"] += 1
                missing_labels_count += 1
            else:
                try:
                    with open(label_path, "r", encoding="utf-8") as lf:
                        lines = [ln.strip() for ln in lf.readlines() if ln.strip()]

                    if not lines:
                        # Empty file is valid in YOLO (background/negative sample)
                        pass

                    for line_idx, line in enumerate(lines):
                        parts = line.split()
                        if len(parts) != 5:
                            split_stat["invalid_boxes"] += 1
                            report["errors"].append(f"Format error in {label_path}:{line_idx+1}: expected 5 values, got {len(parts)}")
                            continue

                        cls_id = int(parts[0])
                        x_c, y_c, bw, bh = map(float, parts[1:])

                        if cls_id not in class_names:
                            split_stat["invalid_boxes"] += 1
                            report["errors"].append(f"Invalid class ID {cls_id} in {label_path}")
                            continue

                        # Check normalization bounds
                        if not (0.0 <= x_c <= 1.0 and 0.0 <= y_c <= 1.0 and 0.0 < bw <= 1.0 and 0.0 < bh <= 1.0):
                            split_stat["invalid_boxes"] += 1
                            report["errors"].append(f"Out-of-bounds coordinates in {label_path}: {[x_c, y_c, bw, bh]}")
                            continue

                        split_stat["boxes_count"] += 1
                        total_boxes += 1
                        c_name = class_names[cls_id]
                        class_counts[c_name] = class_counts.get(c_name, 0) + 1

                except Exception as e:
                    report["errors"].append(f"Error reading label {label_path}: {str(e)}")

        total_images += len(split_images)
        total_labels += len(split_labels)
        report["splits"][split] = split_stat

    # Data Leakage Inspection: Check if same video sequence exists across multiple splits
    train_seqs = sequence_splits["train"]
    val_seqs = sequence_splits["val"]
    test_seqs = sequence_splits["test"]

    train_val_overlap = train_seqs.intersection(val_seqs)
    train_test_overlap = train_seqs.intersection(test_seqs)
    val_test_overlap = val_seqs.intersection(test_seqs)

    if train_val_overlap:
        report["errors"].append(f"DATA LEAKAGE DETECTED! Video sequences present in both Train and Val: {train_val_overlap}")
    if train_test_overlap:
        report["errors"].append(f"DATA LEAKAGE DETECTED! Video sequences present in both Train and Test: {train_test_overlap}")
    if val_test_overlap:
        report["errors"].append(f"DATA LEAKAGE DETECTED! Video sequences present in both Val and Test: {val_test_overlap}")

    # Final readiness checks
    if total_images == 0:
        report["status"] = "FAIL"
        report["errors"].append("Dataset contains 0 images across train/val/test splits.")
    elif total_boxes == 0 and total_labels == 0:
        report["status"] = "BLOCKED_NO_LABELS"
        report["warnings"].append(
            "CRITICAL: Zero bounding-box label files found! ABODA archive does not contain pre-packaged YOLO annotations. "
            "Manual annotation or authoritative bounding-box ground-truth is required before supervised training can begin."
        )

    if report["errors"]:
        report["status"] = "FAIL"

    report["summary"] = {
        "total_images": total_images,
        "total_labels": total_labels,
        "total_boxes": total_boxes,
        "missing_labels": missing_labels_count,
        "class_distribution": class_counts,
        "sequence_distribution": {
            "train": list(train_seqs),
            "val": list(val_seqs),
            "test": list(test_seqs)
        }
    }

    return report


def main():
    parser = argparse.ArgumentParser(description="Validate YOLO dataset integrity")
    parser.add_argument("--dataset_dir", type=str, default="datasets/aboda_yolo", help="YOLO dataset directory")
    parser.add_argument("--data_yaml", type=str, default="datasets/aboda_yolo/data.yaml", help="Path to data.yaml")
    args = parser.parse_args()

    print("=" * 70)
    print("EAGLE EYE AI — YOLO11 Dataset Integrity & Annotation Validator")
    print("=" * 70)

    report = validate_yolo_dataset(args.dataset_dir, args.data_yaml)

    print(f"Dataset Status: {report['status']}")
    print("-" * 70)
    print("Summary:")
    for k, v in report.get("summary", {}).items():
        print(f"  {k}: {v}")

    print("\nSplits Breakdown:")
    for split, stat in report.get("splits", {}).items():
        print(f"  [{split.upper()}]: Images={stat['image_count']}, Labels={stat['label_count']}, BoundingBoxes={stat['boxes_count']}")

    if report["warnings"]:
        print("\nWarnings:")
        for w in report["warnings"]:
            print(f"  [!] {w}")

    if report["errors"]:
        print("\nErrors Found:")
        for err in report["errors"]:
            print(f"  [X] {err}")
    else:
        print("\nZero corruption or structural errors detected.")

    print("=" * 70)


if __name__ == "__main__":
    main()

