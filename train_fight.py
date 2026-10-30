#!/usr/bin/env python3
"""
train_fight.py - Ultralytics YOLO11 Deep Learning Fight Classifier Training Pipeline

Trains YOLO11n-cls on the Roboflow Fight Detection CCTV dataset (1,954 images).
Produces production weights: backend/weights/yolo11_fight_best.pt
"""

import os
import sys
import json
import shutil
import argparse
import torch
from ultralytics import YOLO


def validate_fight_dataset(dataset_path: str):
    print("=" * 70)
    print("EAGLE EYE AI — FIGHT DETECTION DATASET VALIDATION")
    print("=" * 70)
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset path does not exist: {dataset_path}")

    splits = ["train", "valid", "test"]
    classes = ["fight", "un_fight"]
    stats = {}

    for split in splits:
        split_dir = os.path.join(dataset_path, split)
        if not os.path.isdir(split_dir):
            raise FileNotFoundError(f"Missing dataset split directory: {split_dir}")
        stats[split] = {}
        for cls_name in classes:
            cls_dir = os.path.join(split_dir, cls_name)
            if not os.path.isdir(cls_dir):
                raise FileNotFoundError(f"Missing class folder: {cls_dir}")
            img_count = len([f for f in os.listdir(cls_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))])
            stats[split][cls_name] = img_count

    print(f"{'Split':<10} | {'Fight Images':<15} | {'Un-Fight Images':<17} | {'Total':<10}")
    print("-" * 60)
    grand_total = 0
    for split in splits:
        f_cnt = stats[split]["fight"]
        uf_cnt = stats[split]["un_fight"]
        subtotal = f_cnt + uf_cnt
        grand_total += subtotal
        print(f"{split:<10} | {f_cnt:<15} | {uf_cnt:<17} | {subtotal:<10}")
    print("-" * 60)
    print(f"Grand Total: {grand_total} images verified and ready.")
    print("=" * 70)
    return stats


def get_optimal_device() -> str:
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"[Hardware] GPU Acceleration Available: {gpu_name} ({vram_gb:.2f} GB VRAM)")
        return "0"
    else:
        print("[Hardware] Using multi-threaded CPU.")
        return "cpu"


def train_fight_classifier(
    data_dir: str = "datasets/fight_cctv",
    base_weights: str = "backend/weights/yolo11n-cls.pt",
    epochs: int = 50,
    batch_size: int = 32,
    imgsz: int = 224,
    patience: int = 15,
    workers: int = 0,
    project: str = "runs/classify",
    name: str = "fight_detection",
    device: str = "",
    resume: bool = False
):
    abs_data_dir = os.path.abspath(data_dir)
    abs_project_dir = os.path.abspath(project)
    validate_fight_dataset(abs_data_dir)

    selected_device = device if device else get_optimal_device()

    last_checkpoint = os.path.join(abs_project_dir, name, "weights", "last.pt")

    if resume and os.path.exists(last_checkpoint):
        print(f"\n[Resume Training] Resuming from checkpoint: {last_checkpoint}")
        model = YOLO(last_checkpoint)
        results = model.train(resume=True)
    else:
        print(f"\n[Model Init] Loading base classification model: {base_weights}")
        model = YOLO(base_weights)
        print(f"[Training] Initiating fine-tuning for {epochs} epochs (imgsz={imgsz}, batch={batch_size}, device={selected_device})...")
        results = model.train(
            data=abs_data_dir,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch_size,
            workers=workers,
            device=selected_device,
            patience=patience,
            save=True,
            project=abs_project_dir,
            name=name,
            exist_ok=True,
            pretrained=True,
            verbose=True
        )

    save_dir = getattr(model.trainer, "save_dir", os.path.join(abs_project_dir, name))
    best_checkpoint = os.path.join(save_dir, "weights", "best.pt")
    target_weights_path = os.path.join("backend", "weights", "yolo11_fight_best.pt")

    if not os.path.exists(best_checkpoint):
        best_checkpoint = os.path.join(save_dir, "weights", "last.pt")

    if os.path.exists(best_checkpoint):
        os.makedirs(os.path.dirname(target_weights_path), exist_ok=True)
        shutil.copy(best_checkpoint, target_weights_path)
        print(f"\n[Artifact] Best weights checkpoint successfully saved to: {target_weights_path}")
    else:
        print(f"\n[Warning] No checkpoint file found in {save_dir}")

    # Evaluate on Test Split
    print("\n[Evaluation] Running validation against Test set...")
    val_metrics = {}
    try:
        val_results = model.val(data=abs_data_dir, split="test")
        top1 = float(getattr(val_results, "top1", 0.0))
        top5 = float(getattr(val_results, "top5", 0.0))
        val_metrics["top1"] = top1
        val_metrics["top5"] = top5
        print(f"[Evaluation Metrics] Test Top-1 Accuracy: {top1:.4f} | Top-5 Accuracy: {top5:.4f}")
    except Exception as eval_err:
        print(f"[Evaluation Warning] Non-critical test validation note: {eval_err}")

    # Write training metadata summary
    metadata = {
        "model_type": "YOLO11n-cls",
        "dataset": "Fight Detection CCTV v1",
        "classes": ["fight", "un_fight"],
        "target_epochs": epochs,
        "completed_epochs": int(getattr(model.trainer, "epoch", epochs) + 1),
        "imgsz": imgsz,
        "batch_size": batch_size,
        "device": selected_device,
        "metrics": val_metrics,
        "weights_path": target_weights_path
    }
    meta_path = os.path.join("backend", "weights", "yolo11_fight_metadata.json")
    with open(meta_path, "w") as mf:
        json.dump(metadata, mf, indent=2)
    print(f"[Metadata] Training metrics summary saved to: {meta_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLO11 on Fight Detection CCTV Dataset")
    parser.add_argument("--data", type=str, default="datasets/fight_cctv", help="Path to classification dataset folder")
    parser.add_argument("--weights", type=str, default="backend/weights/yolo11n-cls.pt", help="Base weights checkpoint")
    parser.add_argument("--epochs", type=int, default=50, help="Number of epochs (default: 50)")
    parser.add_argument("--batch", type=int, default=32, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=224, help="Classification resolution (default 224)")
    parser.add_argument("--patience", type=int, default=15, help="Early stopping patience")
    parser.add_argument("--workers", type=int, default=0, help="DataLoader workers (0 safe on Windows)")
    parser.add_argument("--device", type=str, default="", help="Device: '0', 'cpu'")
    parser.add_argument("--name", type=str, default="fight_detection", help="Experiment run name")
    parser.add_argument("--resume", action="store_true", help="Resume from last.pt checkpoint")
    args = parser.parse_args()

    train_fight_classifier(
        data_dir=args.data,
        base_weights=args.weights,
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        patience=args.patience,
        workers=args.workers,
        name=args.name,
        device=args.device,
        resume=args.resume
    )
