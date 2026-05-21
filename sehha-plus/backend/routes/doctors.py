from fastapi import APIRouter, Depends
from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("/")
def get_all_doctors(user=Depends(get_current_user)):
    rows = query("""
        SELECT d.DoctorID, u.FullName, d.SpecialtyAR, d.SpecialtyEN,
               d.WorkStart, d.WorkEnd, d.ConsultFee, d.SlotDuration,
               c.NameAR AS ClinicNameAR, c.NameEN AS ClinicNameEN, c.Area
        FROM Doctors d
        JOIN Users   u ON d.UserID   = u.UserID
        JOIN Clinics c ON d.ClinicID = c.ClinicID
        ORDER BY c.ClinicID, d.DoctorID
    """)
    for r in rows:
        r["WorkStart"] = str(r["WorkStart"]) if r["WorkStart"] else None
        r["WorkEnd"]   = str(r["WorkEnd"])   if r["WorkEnd"]   else None
    return rows

@router.get("/profile")
def get_doctor_profile(user=Depends(get_current_user)):
    rows = query("""
        SELECT d.DoctorID, u.FullName, u.Email, u.Phone,
               d.SpecialtyAR, d.SpecialtyEN,
               d.WorkStart, d.WorkEnd, d.ConsultFee,
               c.NameAR AS ClinicNameAR, c.NameEN AS ClinicNameEN,
               c.Area, c.Address
        FROM Doctors d
        JOIN Users   u ON d.UserID   = u.UserID
        JOIN Clinics c ON d.ClinicID = c.ClinicID
        WHERE d.UserID = ?
    """, (int(user["sub"]),))
    if not rows:
        return {}
    r = rows[0]
    r["WorkStart"] = str(r["WorkStart"]) if r["WorkStart"] else None
    r["WorkEnd"]   = str(r["WorkEnd"])   if r["WorkEnd"]   else None
    return r
