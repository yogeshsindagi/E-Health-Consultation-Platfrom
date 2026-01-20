from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
import pytz
from bson import ObjectId
# Import hospitals_col to fetch hospital names
from db import users_col, appointments_col, hospitals_col 
from models import AppointmentRequest
from security import patient_guard, doctor_guard

router = APIRouter(prefix="/appointments", tags=["Appointments"])
IST = pytz.timezone("Asia/Kolkata")

@router.get("/hospitals/{hospital_id}/doctors")
def get_doctors_by_hospital(hospital_id: str):
    doctors = list(users_col.find(
        {"hospitalId": hospital_id, "role": "DOCTOR", "status": "APPROVED"},
        {"passwordHash": 0}
    ))
    
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
        
    return doctors

@router.get("/patient")
def get_my_appointments(user=Depends(patient_guard)):
    """Fetch appointments AND look up details + coordinates"""
    
    appointments = list(appointments_col.find(
        {"patientId": ObjectId(user["user_id"])},
        {"_id": 1, "doctorId": 1, "hospitalId": 1, "slot": 1, "status": 1, "patientId": 1}
    ).sort("slot", -1)) 

    for apt in appointments:
        apt["_id"] = str(apt["_id"])
        apt["patientId"] = str(apt["patientId"])
        
        # Timezone fix
        if apt.get("slot") and apt["slot"].tzinfo is None:
             apt["slot"] = pytz.utc.localize(apt["slot"])
        
        # Doctor Lookup
        doc = users_col.find_one({"_id": apt["doctorId"]}, {"name": 1, "specialization": 1, "wallet_address": 1})
        if doc:
            apt["doctorName"] = doc.get("name", "Unknown Doctor")
            apt["specialization"] = doc.get("specialization", "General Physician")
            apt["doctorWallet"] = doc.get("wallet_address", "")
        else:
            apt["doctorName"] = "Unknown"
            apt["specialization"] = "N/A"
        
        apt["doctorId"] = str(apt["doctorId"])

        # Hospital Lookup (FETCH LOCATION)
        hosp = hospitals_col.find_one(
            {"hospitalId": apt["hospitalId"]}, 
            {"hospitalName": 1, "city": 1, "location": 1} # <--- Request location
        )
        
        if hosp:
            apt["hospitalName"] = hosp.get("hospitalName", "Unknown Hospital")
            apt["hospitalCity"] = hosp.get("city", "")
            # MongoDB GeoJSON is [long, lat]
            apt["hospitalCoords"] = hosp.get("location", {}).get("coordinates") 
        else:
            apt["hospitalName"] = "Unknown Hospital"
            apt["hospitalCity"] = ""
            apt["hospitalCoords"] = None

    return appointments

@router.post("/request")
def request_appointment(data: AppointmentRequest, user=Depends(patient_guard)):

    doctor = users_col.find_one({
        "_id": ObjectId(data.doctorId),
        "hospitalId": data.hospitalId,
        "role": "DOCTOR",
        "status": "APPROVED"
    })

    if not doctor:
        raise HTTPException(404, "Doctor not found in this hospital")

    # 1. Convert incoming slot (UTC from Frontend) to IST for logic checks
    slot_ist = data.slot.astimezone(IST)

    # 2. Check for Clash
    # Note: MongoDB driver automatically converts 'slot_ist' to UTC for the query, matching the DB.
    clash = appointments_col.find_one({
        "doctorId": ObjectId(data.doctorId),
        "slot": slot_ist, 
        "status": {"$in": ["REQUESTED", "ACCEPTED"]}
    })

    if clash:
        raise HTTPException(409, "Slot already booked")

    appointment = {
        "patientId": ObjectId(user["user_id"]),
        "doctorId": ObjectId(data.doctorId),
        "hospitalId": data.hospitalId,
        "slot": slot_ist, # Saved as UTC in Mongo
        "status": "REQUESTED",
        "createdAt": datetime.now(IST)
    }

    appointments_col.insert_one(appointment)

    return {"message": "Appointment requested successfully", "slot": slot_ist}


@router.post("/doctor/{appointment_id}/accept")
def accept_appointment(appointment_id: str, user=Depends(doctor_guard)):
    result = appointments_col.update_one(
        {"_id": ObjectId(appointment_id), "doctorId": ObjectId(user["user_id"])},
        {"$set": {"status": "ACCEPTED"}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Appointment not found")

    return {"message": "Appointment accepted"}

@router.get("/doctor/my-appointments")
def get_doctor_appointments(user=Depends(doctor_guard)):
    """Fetch all appointments for the logged-in DOCTOR"""
    
    # 1. Fetch appointments
    appointments = list(appointments_col.find(
        {"doctorId": ObjectId(user["user_id"])},
        # FIX: Added "doctorId": 1 to this list
        {"_id": 1, "patientId": 1, "hospitalId": 1, "slot": 1, "status": 1, "doctorId": 1}
    ).sort("slot", 1)) 

    for apt in appointments:
        apt["_id"] = str(apt["_id"])
        apt["doctorId"] = str(apt["doctorId"]) # Now this works
        
        # Timezone fix
        if apt.get("slot") and apt["slot"].tzinfo is None:
             apt["slot"] = pytz.utc.localize(apt["slot"])

        # 2. Enrich with PATIENT Name
        patient = users_col.find_one({"_id": apt["patientId"]}, {"name": 1, "email": 1})
        
        if patient:
            apt["patientName"] = patient.get("name", "Unknown Patient")
            apt["patientEmail"] = patient.get("email", "")
        else:
            apt["patientName"] = "Unknown Patient"
            apt["patientEmail"] = ""
            
        apt["patientId"] = str(apt["patientId"])

    return appointments