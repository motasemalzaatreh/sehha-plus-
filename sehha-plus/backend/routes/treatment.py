from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import query, execute
from auth import get_current_user

router = APIRouter(prefix="/api/treatment", tags=["Treatment"])

class UpdateStep(BaseModel):
    status: str
    completed_date: Optional[str] = None

@router.get("/patient")
def get_patient_plans(user=Depends(get_current_user)):
    pts = query("SELECT PatientID FROM Patients WHERE UserID=?", (int(user["sub"]),))
    if not pts:
        return []
    pid = pts[0]["PatientID"]

    plans = query("""
        SELECT tp.PlanID, tp.TitleAR, tp.TitleEN, tp.StartDate, tp.Status,
               u.FullName AS DoctorName, d.SpecialtyAR
        FROM TreatmentPlans tp
        JOIN Doctors d ON tp.DoctorID = d.DoctorID
        JOIN Users   u ON d.UserID    = u.UserID
        WHERE tp.PatientID = ?
        ORDER BY tp.StartDate DESC
    """, (pid,))

    for plan in plans:
        plan["StartDate"] = str(plan["StartDate"]) if plan["StartDate"] else None
        steps = query("""
            SELECT StepID, StepOrder, TitleAR, TitleEN,
                   DescriptionAR, DescriptionEN, Status, CompletedDate
            FROM TreatmentSteps
            WHERE PlanID = ?
            ORDER BY StepOrder
        """, (plan["PlanID"],))
        for s in steps:
            s["CompletedDate"] = str(s["CompletedDate"]) if s["CompletedDate"] else None
        plan["steps"] = steps

    return plans

@router.get("/doctor")
def get_doctor_plans(user=Depends(get_current_user)):
    docs = query("SELECT DoctorID FROM Doctors WHERE UserID=?", (int(user["sub"]),))
    if not docs:
        return []
    did = docs[0]["DoctorID"]

    plans = query("""
        SELECT tp.PlanID, tp.TitleAR, tp.TitleEN, tp.StartDate, tp.Status,
               pu.FullName AS PatientName
        FROM TreatmentPlans tp
        JOIN Patients pt ON tp.PatientID = pt.PatientID
        JOIN Users    pu ON pt.UserID    = pu.UserID
        WHERE tp.DoctorID = ?
        ORDER BY tp.StartDate DESC
    """, (did,))

    for plan in plans:
        plan["StartDate"] = str(plan["StartDate"]) if plan["StartDate"] else None
        steps = query("""
            SELECT StepID, StepOrder, TitleAR, TitleEN, Status, CompletedDate
            FROM TreatmentSteps WHERE PlanID=? ORDER BY StepOrder
        """, (plan["PlanID"],))
        for s in steps:
            s["CompletedDate"] = str(s["CompletedDate"]) if s["CompletedDate"] else None
        plan["steps"] = steps

    return plans

@router.patch("/step/{step_id}")
def update_step(step_id: int, body: UpdateStep, user=Depends(get_current_user)):
    allowed = ["locked", "in_progress", "completed"]
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed}")
    execute("""
        UPDATE TreatmentSteps
        SET Status=?, CompletedDate=?
        WHERE StepID=?
    """, (body.status, body.completed_date, step_id))
    return {"message": "Step updated"}
