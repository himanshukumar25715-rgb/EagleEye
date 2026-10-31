# 🦅 Eagle Eye AI 2.0 — IBM Db2 Enterprise Forensic Vault Guide

This guide details how to leverage the **IBM Db2 Developer Extension** in Visual Studio Code to demonstrate enterprise-grade, tamper-evident security data governance, chain of custody, and analytical stored procedures.

---

## 🌟 Why IBM Db2 in Eagle Eye?

In commercial campus security and defense applications, surveillance alerts (brandished firearms, violent altercations, unattended packages) serve as **legal evidence**. Storing evidence in local flat files or lightweight databases is inadmissible in forensic audits.

Eagle Eye pairs its YOLO11/YOLOv8 real-time computer vision inference engine with **IBM Db2** to deliver:
1. **Cryptographic Chain of Custody**: Every evidence snapshot is hashed using SHA-256 and stored in `EAGLE_EYE.EVIDENCE_VAULT` with an immutable timestamp.
2. **Enterprise Threat Index (Db2 SQL PL Stored Procedure)**: `SP_CALCULATE_CAMPUS_THREAT_INDEX` computes dynamic threat states directly inside the Db2 database engine.
3. **Visual Query Optimization & Explain**: Showcase query execution plans and window partition performance using the **IBM Db2 Developer Extension**.

---

## 🛠️ Step-by-Step: Setting Up the IBM Db2 Developer Extension

### 1. Install the Extension in VS Code
1. Open Visual Studio Code.
2. Go to Extensions (`Ctrl+Shift+X`).
3. Search for: **`IBM Db2 Developer Extension`** (by IBM).
4. Click **Install**.

---

### 2. Connect to an IBM Db2 Database
You can connect to either:
* **Option A: Local Docker Container (IBM Db2 Developer-C Edition)**:
  ```powershell
  docker run -itd --name db2server -p 50000:50000 --env-file .env_db2 -v db2data:/database icr.io/db2_community/db2
  ```
* **Option B: IBM Cloud Db2 on Cloud (Lite/Free Tier)**:
  Create an instance on [cloud.ibm.com](https://cloud.ibm.com) and retrieve connection credentials.

In VS Code:
1. Click the **Db2** icon on the left sidebar.
2. Click **+ (Add Connection)**.
3. Fill in details (refer to `db2/connections.sample.json`):
   * **Host**: `localhost` (or IBM Cloud host)
   * **Port**: `50000` (or `50001` with SSL)
   * **Database**: `EAGLEEYE` (or `BLUDB`)
   * **User**: `db2inst1`
   * **Default Schema**: `EAGLE_EYE`

---

## 🚀 Running the Impressive Demo Playbook

### Step 1: Deploy the Enterprise Forensic Schema
Open [`db2/01_eagle_eye_schema.sql`](file:///d:/sanchay/EagleEye/db2/01_eagle_eye_schema.sql):
* Right-click anywhere in the editor $\to$ **"Run Query"** (or click the Run button at the top).
* Notice the creation of:
  * `EAGLE_EYE.CAMERAS`
  * `EAGLE_EYE.INCIDENT_LOGS`
  * `EAGLE_EYE.EVIDENCE_VAULT` (with `CHAR(64)` SHA-256 hashes and `BOUNDING_BOX_JSON`)
  * `EAGLE_EYE.FORENSIC_AUDIT_TRAIL`

### Step 2: Compile & Execute the Stored Procedure
Open [`db2/02_threat_index_procedure.sql`](file:///d:/sanchay/EagleEye/db2/02_threat_index_procedure.sql):
* Run the script to compile `EAGLE_EYE.SP_CALCULATE_CAMPUS_THREAT_INDEX`.
* Call the procedure directly:
  ```sql
  CALL EAGLE_EYE.SP_CALCULATE_CAMPUS_THREAT_INDEX(24, ?, ?, ?, ?);
  ```
* **What it displays**:
  * Output parameter `p_threat_score`: Real-time composite score ($0.0 - 100.0$)
  * Output parameter `p_threat_level`: e.g. `CRITICAL (DEFCON-1)` or `ELEVATED THREAT`
  * Dynamic result set: The top recent incidents ranked by severity!

### Step 3: Run Visual Explain & Executive Queries
Open [`db2/03_executive_reporting.sql`](file:///d:/sanchay/EagleEye/db2/03_executive_reporting.sql):
* Select Query 1 (Hourly Campus Threat Matrix with Window Functions).
* Right-click $\to$ **"Visual Explain"** (a signature feature of the IBM Db2 Developer Extension!).
* Show the interactive access plan graph to demonstrate database query optimization.

---

## 🔌 Live REST API Integration

Eagle Eye's backend natively connects to this vault:
* **Vault Status Endpoint**: `http://localhost:8000/api/v1/evidence/db2/status`
* **Direct SQL Export**: `http://localhost:8000/api/v1/evidence/db2/export.sql`
  *(Downloads an instant, executable `.sql` file mirroring live camera detections for import into the IBM Db2 Developer Extension).*

