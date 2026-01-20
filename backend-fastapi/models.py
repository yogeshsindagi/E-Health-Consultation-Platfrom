from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PatientRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    wallet_address: Optional[str] = None

class DoctorRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    specialization: str
    licenseNumber: str
    hospitalId: str  
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    wallet_address: Optional[str] = None

class HospitalAdminRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    hospitalId: str

class AppointmentRequest(BaseModel):
    doctorId: str
    hospitalId: str
    slot: datetime

class Medicine(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str

class PrescriptionCreate(BaseModel):
    patientId: str
    appointmentId: str
    diagnosis: str
    medicines: List[Medicine]
    notes: Optional[str] = ""