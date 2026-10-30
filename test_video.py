#!/usr/bin/env python3
"""
test_video.py - End-to-End Surveillance Video Analytics & Temporal Event Inspector

Features:
- Runs YOLO11 + ByteTrack object tracking over video sequences.
- Temporal Abandoned Object Verification:
  * Detects luggage/bags (backpacks, handbags, suitcases).
  * Tracks centroid displacement over time to confirm stationary state.
  * Spatial owner proximity: computes distance between stationary bags and tracked persons.
  * Measures unattended elapsed duration.
  * Generates alerts ONLY when sustained threshold is exceeded (not immediately).
- Generates an annotated output video with bounding boxes, track IDs, and HUD.
- Emits a structured temporal timeline of flagged suspicious events.
"""

import os
import sys
import cv2
import json
import argparse
import numpy as np
from datetime import datetime

# Ensure backend modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from app.cv.pipeline import YOLO11SurveillancePipeline, calculate_sha256


def run_video_pipeline(
    video_path: str,
    output_video_path: str = "output_annotated.mp4",
    weights_path: str = "backend/weights/yolo11n.pt",
    unattended_time_thresh: float = 10.0,
    owner_radius_px: float = 150.0,
    max_frames: int = 1500
):
    print("=" * 70)
    print("EAGLE EYE AI — Temporal Surveillance Video Pipeline")
    print("=" * 70)
    print(f"Source Video     : {video_path}")
    print(f"Model Checkpoint : {weights_path}")
    print(f"Output Video     : {output_video_path}")
    print(f"Unattended Thresh: {unattended_time_thresh:.1f} seconds")
    print(f"Owner Proximity  : {owner_radius_px:.1f} pixels")
    print("-" * 70)

    if not os.path.exists(video_path):
        print(f"ERROR: Video file not found at {video_path}")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Failed to decode video at {video_path}")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    pipeline = YOLO11SurveillancePipeline(weights_path=weights_path)

    # Video Writer (mp4v codec)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    event_timeline = []
    frame_idx = 0
    start_time = cv2.getTickCount()

    print(f"Processing sequence ({width}x{height} @ {fps:.1f} FPS, {total_frames} frames)...")

    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = frame_idx / fps

        # Process frame through YOLO11 + temporal rules
        annotated_frame, alerts = pipeline.process_frame(
            frame, frame_idx, fps, timestamp
        )

        for alert in alerts:
            event_record = {
                "frame": frame_idx,
                "timestamp_sec": round(timestamp, 2),
                "event_type": alert["type"],
                "track_id": alert.get("track_id", "N/A"),
                "confidence": alert.get("confidence", 0.0),
                "description": alert.get("description", ""),
                "bbox": alert.get("bbox", [])
            }
            event_timeline.append(event_record)
            print(f"  [ALERT @ {timestamp:5.1f}s] {alert['type'].upper()}: {alert['description']} (Conf: {alert['confidence']:.2f})")

        out.write(annotated_frame)
        frame_idx += 1

        if frame_idx % 100 == 0:
            pct = (frame_idx / total_frames) * 100 if total_frames > 0 else 0
            print(f"  Progress: {frame_idx}/{total_frames} frames ({pct:.1f}%)...")

    cap.release()
    out.release()

    total_time_sec = (cv2.getTickCount() - start_time) / cv2.getTickFrequency()
    avg_fps = frame_idx / total_time_sec if total_time_sec > 0 else 0

    print("-" * 70)
    print("Video Processing Complete!")
    print(f"Total Frames Processed : {frame_idx}")
    print(f"Average Pipeline Speed : {avg_fps:.1f} FPS")
    print(f"Annotated Video Saved  : {output_video_path}")
    print(f"Total Alerts Flagged   : {len(event_timeline)}")

    # Save event timeline report
    timeline_path = os.path.splitext(output_video_path)[0] + "_events.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "source_video": video_path,
            "processed_at": datetime.now().isoformat(),
            "total_frames": frame_idx,
            "fps": fps,
            "alerts_count": len(event_timeline),
            "events": event_timeline
        }, f, indent=2)
    print(f"Timeline Report Saved  : {timeline_path}")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Run temporal CCTV analytics on test video")
    parser.add_argument("--video", type=str, default="datasets/aboda_raw/video1.avi", help="Path to input video")
    parser.add_argument("--output", type=str, default="runs/output_annotated.mp4", help="Path to output video")
    parser.add_argument("--weights", type=str, default="backend/weights/yolo11n.pt", help="YOLO11 weights path")
    parser.add_argument("--unattended_time", type=float, default=15.0, help="Stationary time threshold (seconds)")
    parser.add_argument("--radius", type=float, default=150.0, help="Owner proximity radius (pixels)")
    parser.add_argument("--max_frames", type=int, default=400, help="Maximum frames to process for test")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    run_video_pipeline(
        video_path=args.video,
        output_video_path=args.output,
        weights_path=args.weights,
        unattended_time_thresh=args.unattended_time,
        owner_radius_px=args.radius,
        max_frames=args.max_frames
    )


if __name__ == "__main__":
    main()
