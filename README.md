# Eagle Eye: AI-Powered College & Hostel Security System (Version 2.0)

**Team**: Ctrl+Shift+Go  
**Members**: Arpit Kumar, Himanshu Kumar, Naman Abhay Singh, Utkarsh Sinha  
**Architecture**: Decoupled React (Vite + TS + Tailwind) + Python (FastAPI + OpenCV)

---

## 🏗️ Architecture Overview

The codebase is cleanly separated into two independent modules:

```text
PrototypeEagle/
├── backend/                  # Python FastAPI Backend & AI CV Pipeline
│   ├── app/
│   │   ├── api/v1/          # RESTful Endpoints (auth, sources, jobs, alerts, analytics, settings, audit)
│   │   ├── core/            # Config, JWT authentication, bcrypt security
│   │   ├── db/              # SQLAlchemy session & SQLite/Postgres configuration
│   │   ├── models/          # ORM Models (User, Source, Job, Alert, Evidence, Setting, AuditLog)
│   │   ├── schemas/         # Pydantic validation contracts
│   │   ├── services/        # WebSocket manager & async video background processor
│   │   ├── cv/              # CV engine & 4 security detection rules
│   │   └── main.py          # FastAPI application & /ws/alerts hub
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py               # Backend startup script (port 8000)
│
├── frontend/                 # React 18+ Single-Page Application (SPA)
│   ├── src/
│   │   ├── api/             # Typed API client
│   │   ├── components/      # UI components (Layout, StatusBadge, TypeBadge)
│   │   ├── pages/           # Pages (Dashboard, SourcesUpload, VideoViewer, AlertQueue, AlertReview, Analytics, Settings, AdminAudit, Login)
│   │   ├── stores/          # Zustand stores (AuthStore with RBAC, AlertStore with WebSocket client)
│   │   ├── App.tsx          # Role-protected routing
│   │   └── main.tsx
│   ├── tailwind.config.js   # Dark green and gold surveillance design theme
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml       # Multi-container on-premise deployment
```

---

## 🚀 Running the Project

### 1. Backend Service (FastAPI)

```bash
cd backend
# Optional: create & activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (runs on http://localhost:8000)
python run.py
```

- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **Live WebSocket Feed**: `ws://localhost:8000/ws/alerts`

### 2. Frontend Application (React + Vite)

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

---

## 🔐 Default Security Credentials

The system initializes with seeded accounts covering all three role tiers:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@eagleeye.edu` | `admin123` | Full control, detection threshold tuning, audit inspection, user management |
| **Operator** | `operator@eagleeye.edu` | `operator123` | Upload footage, monitor live feeds, review & verify candidate alerts, take notes |
| **Viewer** | `viewer@eagleeye.edu` | `viewer123` | Read-only viewing of dashboard metrics and candidate alerts queue |

---

## 🔍 Features Implemented

1. **4 Detection Event Logic Handlers**:
   - 🗡️ **Weapon Detection**: Multi-frame persistence verification with track cooldowns.
   - 🥊 **Fight / Violence**: Proximity and temporal motion threshold rules.
   - 🎒 **Unattended Object**: Bag stationary state tracking with 60s absent-owner timer.
   - 👥 **Overcrowding**: Real-time zone threshold counter.
2. **Human-in-the-Loop Review**:
   - Workflow: `new` $\to$ `in_review` $\to$ `confirmed` / `false_alarm` / `escalated`.
   - Immutable evidence SHA-256 hash validation for legal and administrative audit.
3. **Real-time Push Alerts**:
   - WebSocket client dispatches instant notifications without page refresh.
4. **Video Streaming**:
   - MJPEG live annotated stream during processing + byte-range seekable MP4 review.

