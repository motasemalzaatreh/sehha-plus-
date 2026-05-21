from fastapi import APIRouter, Depends, HTTPException
from database import query
from auth import get_current_user

router = APIRouter(prefix="/api/manager", tags=["Manager"])

def require_manager(user=Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(status_code=403, detail="Manager access only")
    return user

@router.get("/stats")
def get_stats(user=Depends(require_manager)):
    # Overall stats
    totals = query("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN Status='no_show'   THEN 1 ELSE 0 END) AS no_shows,
            SUM(CASE WHEN Status='attended'  THEN 1 ELSE 0 END) AS attended,
            SUM(CASE WHEN Status='pending'   THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN Status='confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN Status='cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM Appointments
    """)

    # Per clinic
    clinics = query("SELECT * FROM vw_NoShowByClinic")

    # Per doctor utilization
    doctors = query("""
        SELECT u.FullName AS DoctorName, d.SpecialtyAR, c.NameAR AS ClinicName,
               COUNT(a.AppointmentID) AS TotalApps,
               SUM(CASE WHEN a.Status='no_show'  THEN 1 ELSE 0 END) AS NoShows,
               SUM(CASE WHEN a.Status='attended' THEN 1 ELSE 0 END) AS Attended
        FROM Doctors d
        JOIN Users u ON d.UserID = u.UserID
        JOIN Clinics c ON d.ClinicID = c.ClinicID
        LEFT JOIN Appointments a ON a.DoctorID = d.DoctorID
        GROUP BY d.DoctorID, u.FullName, d.SpecialtyAR, c.NameAR
        ORDER BY TotalApps DESC
    """)

    # Recent no-shows (for waitlist demo)
    recent_noshows = query("""
        SELECT TOP 5 a.BookingCode, a.AppDate, a.AppTime,
               pu.FullName AS PatientName, du.FullName AS DoctorName,
               c.NameAR AS ClinicName
        FROM Appointments a
        JOIN Patients pt ON a.PatientID = pt.PatientID
        JOIN Users    pu ON pt.UserID   = pu.UserID
        JOIN Doctors  d  ON a.DoctorID  = d.DoctorID
        JOIN Users    du ON d.UserID    = du.UserID
        JOIN Clinics  c  ON d.ClinicID  = c.ClinicID
        WHERE a.Status = 'no_show'
        ORDER BY a.AppDate DESC
    """)
    for r in recent_noshows:
        r["AppDate"] = str(r["AppDate"]) if r["AppDate"] else None
        r["AppTime"] = str(r["AppTime"]) if r["AppTime"] else None

    return {
        "overview":       totals[0] if totals else {},
        "by_clinic":      clinics,
        "by_doctor":      doctors,
        "recent_noshows": recent_noshows,
    }
