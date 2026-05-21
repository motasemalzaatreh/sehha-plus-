from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import query, execute
from auth import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

# ── Schemas ──────────────────────────────────────────────
class BookAppointment(BaseModel):
    doctor_id: int
    app_date:  str   # YYYY-MM-DD
    app_time:  str   # HH:MM
    notes:     Optional[str] = ""

class UpdateStatus(BaseModel):
    status: str
    notes:  Optional[str] = None

# ── Helper ───────────────────────────────────────────────
def _gen_code() -> str:
    import random, string
    return "B-" + "".join(random.choices(string.digits, k=4))

# ── Endpoints ────────────────────────────────────────────

@router.get("/patient")
def get_patient_appointments(user=Depends(get_current_user)):
    rows = query("""
        SELECT a.AppointmentID, a.BookingCode, a.AppDate, a.AppTime, a.Status, a.Notes,
               u.FullName  AS DoctorName,
               d.SpecialtyAR, d.SpecialtyEN,
               c.NameAR    AS ClinicNameAR,
               c.NameEN    AS ClinicNameEN
        FROM Appointments a
        JOIN Patients  p  ON a.PatientID  = p.PatientID
        JOIN Doctors   d  ON a.DoctorID   = d.DoctorID
        JOIN Users     u  ON d.UserID     = u.UserID
        JOIN Clinics   c  ON d.ClinicID   = c.ClinicID
        WHERE p.UserID = ?
        ORDER BY a.AppDate DESC, a.AppTime DESC
    """, (int(user["sub"]),))
    # Serialize dates/times
    for r in rows:
        r["AppDate"] = str(r["AppDate"]) if r["AppDate"] else None
        r["AppTime"] = str(r["AppTime"]) if r["AppTime"] else None
    return rows

@router.get("/doctor")
def get_doctor_appointments(user=Depends(get_current_user)):
    rows = query("""
        SELECT a.AppointmentID, a.BookingCode, a.AppDate, a.AppTime, a.Status, a.Notes,
               pu.FullName   AS PatientName,
               pu.Phone      AS PatientPhone,
               pt.BloodType, pt.Allergies, pt.ChronicDiseases
        FROM Appointments a
        JOIN Doctors   d   ON a.DoctorID  = d.DoctorID
        JOIN Patients  pt  ON a.PatientID = pt.PatientID
        JOIN Users     pu  ON pt.UserID   = pu.UserID
        WHERE d.UserID = ?
        ORDER BY a.AppDate ASC, a.AppTime ASC
    """, (int(user["sub"]),))
    for r in rows:
        r["AppDate"] = str(r["AppDate"]) if r["AppDate"] else None
        r["AppTime"] = str(r["AppTime"]) if r["AppTime"] else None
    return rows

@router.get("/manager")
def get_all_appointments(user=Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = query("""
        SELECT a.AppointmentID, a.BookingCode, a.AppDate, a.AppTime, a.Status,
               pu.FullName  AS PatientName,
               du.FullName  AS DoctorName,
               d.SpecialtyAR,
               c.NameAR     AS ClinicName
        FROM Appointments a
        JOIN Patients pt ON a.PatientID = pt.PatientID
        JOIN Users    pu ON pt.UserID   = pu.UserID
        JOIN Doctors  d  ON a.DoctorID  = d.DoctorID
        JOIN Users    du ON d.UserID    = du.UserID
        JOIN Clinics  c  ON d.ClinicID  = c.ClinicID
        ORDER BY a.AppDate DESC
    """)
    for r in rows:
        r["AppDate"] = str(r["AppDate"]) if r["AppDate"] else None
        r["AppTime"] = str(r["AppTime"]) if r["AppTime"] else None
    return rows

@router.post("/book")
def book_appointment(body: BookAppointment, user=Depends(get_current_user)):
    # Get PatientID from UserID
    pts = query("SELECT PatientID FROM Patients WHERE UserID = ?", (int(user["sub"]),))
    if not pts:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    patient_id = pts[0]["PatientID"]

    # Check no duplicate
    existing = query("""
        SELECT AppointmentID FROM Appointments
        WHERE DoctorID=? AND AppDate=? AND AppTime=? AND Status NOT IN ('cancelled')
    """, (body.doctor_id, body.app_date, body.app_time))
    if existing:
        raise HTTPException(status_code=400, detail="Slot already booked")

    code = _gen_code()
    execute("""
        INSERT INTO Appointments (BookingCode, PatientID, DoctorID, AppDate, AppTime, Status, Notes)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
    """, (code, patient_id, body.doctor_id, body.app_date, body.app_time, body.notes or ""))

    return {"message": "Appointment booked", "booking_code": code}

@router.patch("/{appointment_id}/status")
def update_status(appointment_id: int, body: UpdateStatus, user=Depends(get_current_user)):
    allowed = ['pending','confirmed','attended','no_show','cancelled']
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from {allowed}")
    if body.notes is not None:
        execute("UPDATE Appointments SET Status=?, Notes=? WHERE AppointmentID=?",
                (body.status, body.notes, appointment_id))
    else:
        execute("UPDATE Appointments SET Status=? WHERE AppointmentID=?",
                (body.status, appointment_id))
    return {"message": "Status updated"}

@router.delete("/{appointment_id}")
def cancel_appointment(appointment_id: int, user=Depends(get_current_user)):
    execute("UPDATE Appointments SET Status='cancelled' WHERE AppointmentID=?",
            (appointment_id,))
    return {"message": "Appointment cancelled"}
