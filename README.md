# 🏥 صحة بلس — Sehha Plus
## Hackathon 2026 — Scenario 03

---

## 🗂️ Project Structure
```
sehha-plus/
├── backend/
│   ├── main.py              ← FastAPI entry point
│   ├── database.py          ← SQL Server connection
│   ├── auth.py              ← JWT + password utils
│   ├── .env                 ← DB config (edit this!)
│   ├── requirements.txt
│   └── routes/
│       ├── auth.py
│       ├── appointments.py
│       ├── doctors.py
│       ├── patients.py
│       ├── treatment.py
│       └── manager.py
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx
        ├── api.js
        ├── index.js
        ├── context/AuthContext.jsx
        └── pages/
            ├── Login.jsx
            ├── Patient/PatientDashboard.jsx
            ├── Doctor/DoctorDashboard.jsx
            └── Manager/ManagerDashboard.jsx
```

---

## ⚙️ STEP 1 — Database Setup
1. Open **SQL Server Management Studio (SSMS)**
2. Run `sehha_plus_seed.sql` (F5)
3. Verify: you should see `SehhaPlus` database created

---

## 🐍 STEP 2 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Edit .env if your SQL Server name is different
# DB_SERVER=localhost  (or .\SQLEXPRESS for SQL Express)

# Run server
uvicorn main:app --reload --port 8000
```

✅ Backend running at: http://localhost:8000
✅ API docs at:        http://localhost:8000/docs

---

## ⚛️ STEP 3 — Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start React app
npm start
```

✅ Frontend running at: http://localhost:3000

---

## 🔑 Demo Accounts (password: sehha123)

| Role    | Email               | Dashboard         |
|---------|---------------------|-------------------|
| Patient | ahmed@sehha.jo      | /patient          |
| Doctor  | maha@sehha.jo       | /doctor           |
| Manager | manager@sehha.jo    | /manager          |

---

## 🚀 Features

### Patient
- Book appointments with any doctor
- Cancel with one click (no penalty)
- View treatment plan as visual stages
- View full medical profile

### Doctor  
- Today's schedule with patient medical info
- Mark attendance / no-show / confirmed
- Update treatment plan stages
- View all appointments

### Manager
- No-show rate per clinic (with charts)
- Doctor utilization table
- Smart no-show alerts
- Simulate follow-up SMS

---

## 🛠️ Tech Stack
- **Backend**: Python 3.11 + FastAPI + pyodbc
- **Database**: Microsoft SQL Server
- **Frontend**: React 18 + Recharts
- **Auth**: JWT (python-jose)

---

Built with ❤️ for Hackathon 2026 — Scenario 03
