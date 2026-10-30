#!/usr/bin/env python3
"""
train.py - Ultralytics YOLO11 Transfer Learning & Fine-Tuning Pipeline

Features:
- Hardware auto-detection: checks CUDA availability and GPU VRAM before device assignment.
- Pre-flight dataset validation: runs dataset validator to prevent training on corrupt/unlabeled data.
- Strict scientific policy: blocks execution if valid annotations are missing (no fake progress).
- Configurable training parameters: epochs, image size, batch size, workers, early stopping (patience).
- Resumption capability and checkpoint management.
"""

import os
import sys
import argparse
import torch
from ultralytics import YOLO
from validate_dataset import validate_yolo_dataset


def get_optimal_device() -> str:
    """Detects available hardware and verifies PyTorch CUDA compatibility."""
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_count = torch.cuda.device_count()
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"[Hardware] GPU Acceleration Available: {gpu_name} ({vram_gb:.2f} GB VRAM, {gpu_count} GPU[s])")
        return "0"
    else:
        print("[Hardware] No compatible CUDA GPU detected. Falling back to multi-threaded CPU inference/training.")
        return "cpu"


def train_yolo11(args):
    print("=" * 70)
    print("EAGLE EYE AI — YOLO11 Model Training Pipeline")
    print("=" * 70)
    print(f"Data Configuration : {args.data}")
    print(f"Base Weights       : {args.weights}")
    print(f"Target Epochs      : {args.epochs}")
    print(f"Batch Size         : {args.batch}")
    print(f"Image Resolution   : {args.imgsz}x{args.imgsz}")
    print(f"Early Stop Patience: {args.patience}")
    print(f"Run Name           : {args.name}")
    print("-" * 70)

    # 1. Pre-flight Dataset Validation Check
    dataset_dir = os.path.dirname(os.path.abspath(args.data))
    print("[Pre-flight] Validating dataset integrity and ground-truth annotations...")
    val_report = validate_yolo_dataset(dataset_dir, args.data)

    if val_report["status"] == "FAIL":
        print("\n[ERROR] Dataset validation failed with structural errors:")
        for err in val_report["errors"]:
            print(f"  - {err}")
        print("\nTraining aborted. Resolve dataset errors before proceeding.")
        sys.exit(1)

    if val_report["status"] == "BLOCKED_NO_LABELS" or val_report["summary"]["total_boxes"] == 0:
        print("\n" + "!" * 70)
        print("[BLOCKED] CANNOT INITIATE SUPERVISED TRAINING: ZERO BOUNDING-BOX LABELS FOUND!")
        print("!" * 70)
        print("Cause Analysis:")
        print("  - The ABODA video dataset contains raw CCTV sequences without standard YOLO annotation files.")
        print("  - Supervised object detection requires ground-truth bounding boxes for each object class.")
        print("  - Please refer to 'TRAINING_GUIDE.md' to annotate the extracted frames with LabelImg/CVAT.")
        print("\nAction Required:")
        print("  1. Label the frames located in 'datasets/aboda_yolo/images/train/' and 'val/'.")
        print("  2. Place the resulting .txt annotation files into 'datasets/aboda_yolo/labels/'.")
        print("  3. Re-run 'python validate_dataset.py' until status reports 'PASS'.")
        print("  4. Re-run 'python train.py'.")
        print("!" * 70)
        sys.exit(2)

    # 2. Hardware Device Assignment
    device = args.device if args.device else get_optimal_device()

    # 3. Model Initialization
    print(f"\n[Model] Loading base YOLO11 weights: {args.weights}...")
    model = YOLO(args.weights)

    # 4. Training Execution
    print(f"\n[Training] Starting transfer learning on {device}...")
    try:
        results = model.train(
            data=args.data,
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=args.batch,
            workers=args.workers,
            device=device,
            patience=args.patience,
            save=True,
            project=args.project,
            name=args.name,
            exist_ok=True,
            pretrained=True,
            verbose=True
        )
        print("\n[Success] Training completed successfully!")
        best_pt = os.path.join(args.project, args.name, "weights", "best.pt")
        print(f"[Model] Best checkpoint saved to: {best_pt}")
        return results
    except Exception as e:
        print(f"\n[ERROR] An exception occurred during training: {str(e)}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Train YOLO11 on custom dataset")
    parser.add_argument("--data", type=str, default="datasets/aboda_yolo/data.yaml", help="Path to data.yaml")
    parser.add_argument("--weights", type=str, default="backend/weights/yolo11n.pt", help="Initial weights checkpoint")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (reduce if CPU memory is limited)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution for training")
    parser.add_argument("--workers", type=int, default=2, help="DataLoader worker processes")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience epochs")
    parser.add_argument("--device", type=str, default="", help="Device: '0', 'cpu', etc.")
    parser.add_argument("--project", type=str, default="runs/train", help="Project directory")
    parser.add_argument("--name", type=str, default="yolo11_aboda", help="Experiment run name")
    args = parser.parse_args()

    train_yolo11(args)


if __name__ == "__main__":
    main()

