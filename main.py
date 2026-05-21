from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth         import router as auth_router
from routes.appointments import router as appointments_router
from routes.doctors      import router as doctors_router
from routes.patients     import router as patients_router
from routes.treatment    import router as treatment_router
from routes.manager      import router as manager_router
from routes.chat         import router as chat_router

app = FastAPI(
    title="Sehha Plus API — صحة بلس",
    description="Clinic management system for Dr. Ahmad's 4-clinic network in Amman",
    version="1.0.0",
    debug=True
)

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(appointments_router)
app.include_router(doctors_router)
app.include_router(patients_router)
app.include_router(treatment_router)
app.include_router(manager_router)
app.include_router(chat_router)

@app.get("/")
def root():
    return {
        "message": "Sehha Plus API is running ✅",
        "docs":    "http://localhost:8000/docs"
    }
