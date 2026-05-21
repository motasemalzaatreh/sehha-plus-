from fastapi import APIRouter, Depends
from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("/profile")
def get_patient_profile(user=Depends(get_current_user)):
    rows = query("""
        SELECT p.PatientID, u.FullName, u.Email, u.Phone,
               p.DateOfBirth, p.Gender, p.BloodType,
               p.Allergies, p.ChronicDiseases
        FROM Patients p
        JOIN Users u ON p.UserID = u.UserID
        WHERE p.UserID = ?
    """, (int(user["sub"]),))
    if not rows:
        return {}
    r = rows[0]
    r["DateOfBirth"] = str(r["DateOfBirth"]) if r["DateOfBirth"] else None
    return r

@router.get("/history")
def get_patient_history(user=Depends(get_current_user)):
    rows = query("""
        SELECT * FROM vw_PatientHistory
        WHERE PatientName = (SELECT FullName FROM Users WHERE UserID = ?)
        ORDER BY AppDate DESC
    """, (int(user["sub"]),))
    for r in rows:
        r["AppDate"] = str(r["AppDate"]) if r["AppDate"] else None
        r["AppTime"] = str(r["AppTime"]) if r["AppTime"] else None
    return rows
