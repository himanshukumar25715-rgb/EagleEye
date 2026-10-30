# Eagle Eye AI — ABODA Dataset Preparation & YOLO11 Training Guide

This guide details the complete protocol for preparing, labeling, validating, training, and evaluating a custom **Ultralytics YOLO11** model on the **ABODA (Abandoned Object Dataset)**.

---

## 1. Dataset Status & Diagnostic Findings

* **Archive Source**: `ABODA-master.zip` extracted to `datasets/aboda_raw/`.
* **Sequences**: 11 video files (`video1.avi` through `video11.avi`), totaling **37,653 frames** (~20.9 minutes of video).
* **Ground Truth Analysis**: The ABODA release archive contains **raw video sequences only** and a text README. It does **not** include pre-packaged YOLO bounding-box annotations (`.txt` files).
* **Supervised Training Policy**: Per computer-vision best practices and strict project policy, supervised training is blocked until valid spatial bounding-box labels are supplied.

---

## 2. Directory Architecture

```text
PrototypeEagle/
├── datasets/
│   ├── aboda_raw/             # 11 original .avi sequences (immutable)
│   ├── aboda_extracted/       # 513 letterboxed keyframes + manifest.json & manifest.csv
│   └── aboda_yolo/            # Standard YOLO layout (split by sequence)
│       ├── images/
│       │   ├── train/         # 281 frames (video1, 2, 3, 5, 6, 7, 9)
│       │   ├── val/           # 105 frames (video8, 10)
│       │   └── test/          # 127 frames (video4, 11)
│       ├── labels/
│       │   ├── train/         # Target destination for YOLO .txt labels
│       │   ├── val/
│       │   └── test/
│       └── data.yaml          # Dataset configuration contract
├── prepare_aboda.py           # Frame extraction & letterbox sampler
├── create_splits.py           # Sequence-based data partitioner
├── validate_dataset.py        # Strict format & data leakage validator
├── train.py                   # Transfer learning trainer with pre-flight checks
├── evaluate.py                # mAP benchmark & inference auditor
├── test_video.py              # Temporal CCTV analytics runner
└── data.yaml
```

---

## 3. Data Leakage Prevention Strategy

To prevent data leakage, splitting is strictly conducted **by source video sequence** rather than random frame shuffling:

| Split | Sequences Included | Frame Count | Role |
| :--- | :--- | :--- | :--- |
| **Train** | `video1`, `video2`, `video3`, `video5`, `video6`, `video7`, `video9` | 281 | Model gradient updates |
| **Validation** | `video8`, `video10` | 105 | Hyperparameter & checkpoint tuning |
| **Test** | `video4`, `video11` | 127 | Unbiased final generalization evaluation |

---

## 4. Annotation Protocol & Labeling Guide

### Recommended Labeling Tools
1. **CVAT (Computer Vision Annotation Tool)** (Recommended for video sequences): [https://www.cvat.ai](https://www.cvat.ai)
2. **LabelImg**: Local desktop annotation tool (`pip install labelImg && labelImg`).
3. **Roboflow**: Cloud-based annotation with one-click YOLO export.

### Class Taxonomy & Definition

| Class ID | Class Name | Definition & Labeling Rules |
| :--- | :--- | :--- |
| `0` | `abandoned_object` | Luggage, backpacks, boxes, or parcels that are stationary and physically separated from any person. |
| `1` | `person` | Any pedestrian or student visible in the camera frame. |
| `2` | `luggage_bag` | Any bag or object actively carried, held, or situated adjacent to an owner. |

### Labeling Policy (Important)
> [!IMPORTANT]
> A static frame alone cannot prove an object is legally "abandoned." To label properly:
> 1. Use `luggage_bag` (Class 2) when the person is carrying or standing right next to the bag.
> 2. Switch the label to `abandoned_object` (Class 0) only on frames where the owner has walked away and the object remains unattended.
> 3. Each bounding box must be tightly bounded around the object.

### YOLO Annotation Format
Each image `videoX_fY.jpg` must have a corresponding `videoX_fY.txt` in `datasets/aboda_yolo/labels/<split>/`:
```text
<class_id> <x_center> <y_center> <width> <height>
```
*(All coordinates normalized between 0.0 and 1.0).*

---

## 5. Execution Commands (Windows PowerShell)

### Step 1: Extract Frames
```powershell
python prepare_aboda.py --input_dir datasets/aboda_raw --output_dir datasets/aboda_extracted --interval_sec 1.0
```

### Step 2: Partition Splits
```powershell
python create_splits.py
```

### Step 3: Validate Annotations & Check for Leakage
```powershell
python validate_dataset.py --dataset_dir datasets/aboda_yolo --data_yaml datasets/aboda_yolo/data.yaml
```

### Step 4: Train YOLO11
Once labels are placed in `datasets/aboda_yolo/labels/` and validation reports `PASS`:
```powershell
python train.py --data datasets/aboda_yolo/data.yaml --epochs 50 --batch 16 --imgsz 640
```

### Step 5: Evaluate the Checkpoint
```powershell
python evaluate.py --weights runs/train/yolo11_aboda/weights/best.pt --data datasets/aboda_yolo/data.yaml
```

### Step 6: Test Video Sequence Analytics
```powershell
python test_video.py --video datasets/aboda_raw/video1.avi --output runs/test_video1_annotated.mp4
```

---

## 6. Temporal Abandoned-Object Logic

In CCTV surveillance, standard YOLO detection is only the spatial detector. The **temporal tracking layer** (`backend/app/cv/pipeline.py` & `test_video.py`):
1. Tracks bags using **ByteTrack** across consecutive frames.
2. Monitors centroid coordinates $\Delta(x, y)$ to detect stationary condition.
3. Computes Euclidean distance between the bag and all tracked people:
   $$\text{Dist} = \sqrt{(x_{bag} - x_{person})^2 + (y_{bag} - y_{person})^2}$$
4. If $\text{Dist} > R_{owner}$ (default 150 px) continuously for $\ge 60$ seconds (or configured threshold), it raises a candidate **Unattended Object** alert with high confidence and logs evidence to the database.

