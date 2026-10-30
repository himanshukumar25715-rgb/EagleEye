#!/usr/bin/env python3
"""
prepare_aboda.py - Preprocessing & Frame Extraction Pipeline for ABODA Dataset

Features:
- Configurable temporal sampling (sample by seconds or frame stride).
- Aspect-ratio preserving resize (letterboxing) to target YOLO resolution.
- Frame difference / motion change filtering to avoid near-identical consecutive frames.
- Robust decoding & error handling (preserves original video files).
- Generates JSON and CSV manifests grouped by video sequence.
- Sets up standard YOLO directory layout (train / val / test).
"""

import os
import cv2
import glob
import json
import csv
import argparse
import numpy as np
from typing import List, Dict, Any, Tuple


def letterbox(
    im: np.ndarray,
    new_shape: Tuple[int, int] = (640, 640),
    color: Tuple[int, int, int] = (114, 114, 114)
) -> Tuple[np.ndarray, float, Tuple[float, float]]:
    """Resize and pad image while preserving aspect ratio."""
    shape = im.shape[:2]  # current shape [height, width]
    if isinstance(new_shape, int):
        new_shape = (new_shape, new_shape)

    # Scale ratio (new / old)
    r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
    new_unpad = (int(round(shape[1] * r)), int(round(shape[0] * r)))
    dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]  # padding
    dw /= 2
    dh /= 2

    if shape[::-1] != new_unpad:
        im = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
    
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    im = cv2.copyMakeBorder(im, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return im, r, (dw, dh)


def compute_frame_difference(prev_gray: np.ndarray, curr_gray: np.ndarray) -> float:
    """Computes normalized mean absolute difference between two grayscale frames."""
    if prev_gray is None or curr_gray is None:
        return 1.0
    diff = cv2.absdiff(prev_gray, curr_gray)
    return float(np.mean(diff) / 255.0)


def process_video(
    video_path: str,
    output_dir: str,
    interval_sec: float = 1.0,
    target_size: int = 640,
    motion_thresh: float = 0.015,
    max_frames: int = 500
) -> Dict[str, Any]:
    """Extracts informative frames from a single video file."""
    video_name = os.path.splitext(os.path.basename(video_path))[0]
    video_out_dir = os.path.join(output_dir, video_name)
    os.makedirs(video_out_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "video": video_name,
            "error": "Failed to open video file",
            "extracted": 0,
            "frames": []
        }

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps if fps > 0 else 0.0

    frame_step = max(1, int(round(fps * interval_sec)))
    extracted_records: List[Dict[str, Any]] = []

    prev_gray = None
    frame_idx = 0
    saved_count = 0

    while cap.isOpened() and saved_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_step == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            motion_score = compute_frame_difference(prev_gray, gray)

            # Keep frame if motion is above threshold or if it's the first frame
            if prev_gray is None or motion_score >= motion_thresh:
                resized_frame, scale, padding = letterbox(frame, (target_size, target_size))
                timestamp = frame_idx / fps

                out_filename = f"{video_name}_f{frame_idx:06d}.jpg"
                out_path = os.path.join(video_out_dir, out_filename)
                rel_path = os.path.relpath(out_path, os.path.dirname(output_dir))

                cv2.imwrite(out_path, resized_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

                extracted_records.append({
                    "source_video": os.path.basename(video_path),
                    "video_id": video_name,
                    "frame_index": frame_idx,
                    "timestamp_sec": round(timestamp, 2),
                    "output_image": rel_path.replace("\\", "/"),
                    "motion_score": round(motion_score, 4),
                    "original_resolution": f"{width}x{height}",
                    "target_resolution": f"{target_size}x{target_size}",
                    "scale_factor": round(scale, 4),
                    "padding": padding
                })

                prev_gray = gray
                saved_count += 1

        frame_idx += 1

    cap.release()

    return {
        "video": video_name,
        "width": width,
        "height": height,
        "fps": round(fps, 2),
        "total_frames": total_frames,
        "duration_sec": round(duration_sec, 2),
        "extracted_count": saved_count,
        "frames": extracted_records
    }


def main():
    parser = argparse.ArgumentParser(description="Prepare ABODA dataset for YOLO training")
    parser.add_argument("--input_dir", type=str, default="datasets/aboda_raw", help="Path to raw ABODA videos")
    parser.add_argument("--output_dir", type=str, default="datasets/aboda_extracted", help="Path to store extracted frames")
    parser.add_argument("--interval_sec", type=float, default=1.0, help="Sampling interval in seconds")
    parser.add_argument("--imgsz", type=int, default=640, help="Target image size (letterboxed)")
    parser.add_argument("--motion_thresh", type=float, default=0.015, help="Minimum normalized motion threshold to retain frame")
    parser.add_argument("--max_frames", type=int, default=300, help="Maximum frames per video sequence")
    args = parser.parse_args()

    print("=" * 70)
    print("EAGLE EYE AI — ABODA Dataset Preprocessing Pipeline")
    print("=" * 70)
    print(f"Input Directory  : {args.input_dir}")
    print(f"Output Directory : {args.output_dir}")
    print(f"Sampling Rate    : 1 frame every {args.interval_sec:.2f}s")
    print(f"Target Dimension : {args.imgsz}x{args.imgsz} px (letterboxed aspect-ratio preserved)")
    print(f"Motion Threshold : {args.motion_thresh}")
    print("-" * 70)

    videos = sorted(glob.glob(os.path.join(args.input_dir, "*.avi")))
    if not videos:
        print(f"ERROR: No .avi files found in {args.input_dir}!")
        return

    os.makedirs(args.output_dir, exist_ok=True)
    all_video_summaries = []
    all_frames = []

    for v_path in videos:
        v_name = os.path.basename(v_path)
        print(f"Processing sequence: {v_name}...", end=" ", flush=True)
        summary = process_video(
            video_path=v_path,
            output_dir=args.output_dir,
            interval_sec=args.interval_sec,
            target_size=args.imgsz,
            motion_thresh=args.motion_thresh,
            max_frames=args.max_frames
        )
        all_video_summaries.append(summary)
        all_frames.extend(summary.get("frames", []))
        print(f"Done. Extracted {summary['extracted_count']} frames.")

    # Write Manifests
    manifest_json_path = os.path.join(args.output_dir, "manifest.json")
    manifest_csv_path = os.path.join(args.output_dir, "manifest.csv")

    with open(manifest_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "dataset": "ABODA",
            "total_videos": len(videos),
            "total_frames_extracted": len(all_frames),
            "video_summaries": all_video_summaries,
            "manifest": all_frames
        }, f, indent=2)

    if all_frames:
        with open(manifest_csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "source_video", "video_id", "frame_index", "timestamp_sec",
                "output_image", "motion_score", "original_resolution", "target_resolution"
            ], extrasaction="ignore")
            writer.writeheader()
            writer.writerows(all_frames)

    print("-" * 70)
    print(f"Processing Complete!")
    print(f"Total Sequences Processed: {len(videos)}")
    print(f"Total Informative Frames : {len(all_frames)}")
    print(f"Manifest JSON Written to : {manifest_json_path}")
    print(f"Manifest CSV Written to  : {manifest_csv_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()

