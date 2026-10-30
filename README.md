# Eagle Eye v2.0 - AI-Powered Campus & Perimeter Surveillance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10+-black.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-black.svg)](https://fastapi.tiangolo.com)
[![React: 18](https://img.shields.io/badge/React-18.x-yellow.svg)](https://react.dev)
[![Ultralytics YOLO11](https://img.shields.io/badge/YOLO11-Ultralytics-red.svg)](https://github.com/ultralytics/ultralytics)

Eagle Eye v2.0 is an enterprise-grade, real-time AI computer vision surveillance system designed for college campuses, perimeter boundaries, corridors, and dining halls.

---

## ⚡ Core Features

- **Decoupled Architecture**: High-throughput FastAPI (Python) backend with reactive React 18 (TypeScript + Vite) frontend.
- **Strict Color Palette**: Built with a high-contrast security theme using **White, Black, Red, and Yellow**.
- **Ultralytics YOLO11n + ByteTrack**: Real-time multi-person tracking and object classification.
- **Roboflow Serverless Integration**: Integrated serverless knife and weapon review workflow (`cctv-gun-and-knife-video-review`).
- **ABODA Dataset Trained**: Trained on Abandoned Object Dataset with temporal persistence logic for stationary unattended bag detection.
- **Incident Queue & Verification**: Real-time WebSocket streaming, human operator confirmation/false-alarm dismissal workflow, and immutable SHA-256 evidence chain.
- **Multi-Cam Matrix**: Live concurrent CCTV matrix view with instant full-screen feed focus.

---

## 🛠️ Quick Start

### 1. Single-Click Launch (Windows)
```cmd
start.bat
```

### 2. Manual Setup

#### Backend:
```bash
pip install -r backend/requirements.txt
python run_backend.py
```
Backend API will be accessible at `http://localhost:8000` with Swagger documentation at `http://localhost:8000/docs`.

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will be accessible at `http://localhost:5173`.

---

## 🔐 Credentials & RBAC

- **Admin**: `admin@eagleeye.edu` / `admin123`
- **Operator**: `operator@eagleeye.edu` / `operator123`
- **Viewer**: `viewer@eagleeye.edu` / `viewer123`
