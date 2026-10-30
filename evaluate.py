#!/usr/bin/env python3
"""
evaluate.py - YOLO11 Evaluation & Benchmark Suite

Modes:
1. Benchmark Mode (Supervised): If a labeled test dataset exists, computes standard COCO mAP metrics:
   - Precision, Recall, mAP@0.50, mAP@0.50:0.95, and confusion matrix.
2. Inference Audit Mode (Zero-shot / Baseline / Unlabeled): If annotations are pending, evaluates
   the YOLO11 model on test video sequences (e.g. video4, video11), measuring:
   - Inference speed (ms per frame, processed FPS).
   - Class detection distributions (persons, bags, potential objects).
   - Saves qualitative prediction samples to runs/evaluate/.
"""

import os
import cv2
import glob
import argparse
import numpy as np
from ultralytics import YOLO


def evaluate_labeled(model_path: str, data_yaml: str):
    """Evaluates fine-tuned model against labeled test set with ground truth."""
    print(f"[Evaluation] Loading model: {model_path}...")
    model = YOLO(model_path)
    
    print(f"[Evaluation] Evaluating against labeled test split in {data_yaml}...")
    metrics = model.val(data=data_yaml, split="test", imgsz=640)
    
    print("\n" + "=" * 60)
    print("ACTUAL MEASURED TEST METRICS")
    print("=" * 60)
    print(f"Precision (P)   : {metrics.box.mp:.4f}")
    print(f"Recall (R)      : {metrics.box.mr:.4f}")
    print(f"mAP@0.50        : {metrics.box.map50:.4f}")
    print(f"mAP@0.50:0.95   : {metrics.box.map:.4f}")
    print("=" * 60)
    return metrics


def evaluate_unlabeled_sequences(
    model_path: str,
    test_videos: list,
    output_dir: str = "runs/evaluate"
):
    """Evaluates detection capabilities on held-out test video sequences."""
    print("=" * 70)
    print("EAGLE EYE AI — YOLO11 Video Inference & Detection Audit")
    print("=" * 70)
    print(f"Model Checkpoint : {model_path}")
    print(f"Test Sequences   : {test_videos}")
    print(f"Output Directory : {output_dir}")
    print("-" * 70)

    os.makedirs(output_dir, exist_ok=True)
    model = YOLO(model_path)

    for vpath in test_videos:
        if not os.path.exists(vpath):
            print(f"[Warning] Test video not found: {vpath}")
            continue

        vname = os.path.basename(vpath)
        print(f"\nAuditing video sequence: {vname}...")
        cap = cv2.VideoCapture(vpath)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_count = 0
        detected_persons = 0
        detected_bags = 0
        inference_times = []

        # Sample every 15th frame for evaluation (~2 FPS)
        sample_step = max(1, int(fps // 2))

        while cap.isOpened() and frame_count < min(total_frames, 600):
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % sample_step == 0:
                start_t = cv2.getTickCount()
                results = model(frame, verbose=False, conf=0.30, imgsz=640)
                end_t = cv2.getTickCount()

                dt_ms = (end_t - start_t) / cv2.getTickFrequency() * 1000
                inference_times.append(dt_ms)

                res = results[0]
                boxes = res.boxes
                if boxes is not None:
                    for b in boxes:
                        cls_id = int(b.cls[0].item())
                        if cls_id == 0:
                            detected_persons += 1
                        elif cls_id in [24, 26, 28]: # backpack, handbag, suitcase
                            detected_bags += 1

                # Save sample visual predictions
                if frame_count % (sample_step * 10) == 0:
                    annotated = res.plot()
                    out_sample = os.path.join(output_dir, f"{os.path.splitext(vname)[0]}_f{frame_count:04d}.jpg")
                    cv2.imwrite(out_sample, annotated)

            frame_count += 1

        cap.release()

        avg_latency = np.mean(inference_times) if inference_times else 0.0
        effective_fps = 1000.0 / avg_latency if avg_latency > 0 else 0.0

        print(f"  Processed Frames      : {len(inference_times)} sampled frames")
        print(f"  Average Latency       : {avg_latency:.2f} ms per frame ({effective_fps:.1f} FPS)")
        print(f"  Persons Detected      : {detected_persons} instances")
        print(f"  Bags/Luggage Detected : {detected_bags} instances")

    print("\n" + "=" * 70)
    print("Qualitative detection visual samples written to:", output_dir)
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Evaluate YOLO11 on dataset or test videos")
    parser.add_argument("--weights", type=str, default="backend/weights/yolo11n.pt", help="Model weights path")
    parser.add_argument("--data", type=str, default="datasets/aboda_yolo/data.yaml", help="data.yaml path")
    parser.add_argument("--test_video", type=str, default="", help="Optional test video path")
    args = parser.parse_args()

    # Check if labels exist in test split
    test_labels = glob.glob("datasets/aboda_yolo/labels/test/*.txt")
    has_labels = len(test_labels) > 0 and any(os.path.getsize(p) > 0 for p in test_labels)

    if has_labels:
        evaluate_labeled(args.weights, args.data)
    else:
        print("[Notice] Ground-truth test annotations not found in datasets/aboda_yolo/labels/test/.")
        print("[Notice] Executing video-sequence inference audit on held-out test videos (video4.avi & video11.avi)...")
        test_vids = [args.test_video] if args.test_video else [
            "datasets/aboda_raw/video4.avi",
            "datasets/aboda_raw/video11.avi"
        ]
        evaluate_unlabeled_sequences(args.weights, test_vids)


if __name__ == "__main__":
    main()

