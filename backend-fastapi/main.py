from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import register, login, admin, appointments, prescriptions, hospitals, users

app = FastAPI(title="Secure E-Health Platform")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"🔥 UNHANDLED ERROR: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

app.include_router(register.router)
app.include_router(login.router)
app.include_router(admin.router)
app.include_router(appointments.router)
app.include_router(prescriptions.router)
app.include_router(hospitals.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"status": "E-Health Backend Running"}
