from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import query
from auth import verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(body: LoginRequest):
    rows = query(
        "SELECT UserID, FullName, Email, Password, Role, Phone FROM Users WHERE Email = ?",
        (body.email,)
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user = rows[0]
    if not verify_password(body.password, user["Password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong password")

    token = create_token({
        "sub":    str(user["UserID"]),
        "email":  user["Email"],
        "role":   user["Role"],
        "name":   user["FullName"],
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":    user["UserID"],
            "name":  user["FullName"],
            "email": user["Email"],
            "role":  user["Role"],
            "phone": user["Phone"],
        }
    }
