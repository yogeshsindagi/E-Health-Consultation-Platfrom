from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import datetime
import pytz
from bson import ObjectId
import hashlib, json
from typing import List, Optional
from pydantic import BaseModel

from db import prescriptions_col, appointments_col
from models import PrescriptionCreate, Medicine # Assuming Medicine is defined in models.py
from security import doctor_guard, patient_guard

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])
IST = pytz.timezone("Asia/Kolkata")

# --- Pydantic Model for Patient Upload ---
class PatientUploadSchema(BaseModel):
    diagnosis: str
    medicines: List[Medicine]
    notes: Optional[str] = None

@router.post("/doctor")
def create_prescription(data: PrescriptionCreate, user=Depends(doctor_guard)):
    try:
        appointment = appointments_col.find_one({
            "_id": ObjectId(data.appointmentId),
            "doctorId": ObjectId(user["user_id"]),
            "status": "ACCEPTED"
        })

        if not appointment:
            raise HTTPException(403, "Invalid appointment")

        prescription = {
            "patientId": ObjectId(data.patientId),
            "doctorId": ObjectId(user["user_id"]),
            "hospitalId": appointment["hospitalId"],
            "appointmentId": ObjectId(data.appointmentId),
            "diagnosis": data.diagnosis,
            "medicines": [m.dict() for m in data.medicines],
            "notes": data.notes,
            "createdAt": datetime.now(IST),
            "source": "DOCTOR"
        }

        # Hash for blockchain / tamper proof
        hash_value = hashlib.sha256(json.dumps(prescription, default=str).encode()).hexdigest()
        prescription["hash"] = hash_value

        prescriptions_col.insert_one(prescription)

        return {
            "message": "Prescription created successfully",
            "hash": hash_value
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Prescription creation failed: {str(e)}")


# --- UPDATED: Handle Text/JSON Upload from Patient ---
@router.post("/upload")
def upload_prescription_text(
    data: PatientUploadSchema, 
    user=Depends(patient_guard)
):
    """
    Endpoint for patients to upload self-reported records as TEXT data (JSON).
    """
    try:
        # Create the record object
        prescription = {
            "patientId": ObjectId(user["user_id"]),
            "diagnosis": data.diagnosis,
            # Convert Pydantic models to dicts
            "medicines": [m.dict() for m in data.medicines], 
            "notes": data.notes,
            "doctorId": "Self", # Mark as Self/Patient
            "doctorName": "Self Reported",
            "hospitalName": "Personal Record",
            "createdAt": datetime.now(IST),
            "source": "PATIENT_UPLOAD"
        }

        # Generate Hash for integrity
        # (Even though it's self-reported, hashing ensures the data hasn't changed since upload)
        hash_value = hashlib.sha256(json.dumps(prescription, default=str).encode()).hexdigest()
        prescription["hash"] = hash_value

        result = prescriptions_col.insert_one(prescription)

        return {
            "message": "Record saved successfully",
            "id": str(result.inserted_id),
            "hash": hash_value
        }

    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(500, f"Upload failed: {str(e)}")


@router.get("/patient")
def get_my_prescriptions(user=Depends(patient_guard)):
    try:
        # 1. Fetch from DB
        prescriptions = list(prescriptions_col.find(
            {"patientId": ObjectId(user["user_id"])}
        ).sort("createdAt", -1))

        # 2. Convert ObjectIds to Strings & handle missing fields
        for pres in prescriptions:
            pres["_id"] = str(pres["_id"])
            pres["patientId"] = str(pres["patientId"])
            
            # Handle fields that might be generic for self-uploads
            pres["doctorId"] = str(pres.get("doctorId", "Self"))
            
            if "hospitalId" in pres:
                pres["hospitalId"] = str(pres["hospitalId"])
            if "appointmentId" in pres:
                pres["appointmentId"] = str(pres["appointmentId"])
                
        return prescriptions
    except Exception as e:
        print(f"Error fetching prescriptions: {e}")
        raise HTTPException(500, f"Fetch failed: {str(e)}")


@router.get("/doctor")
def get_doctor_prescriptions(user=Depends(doctor_guard)):
    try:
        # 1. Fetch from DB
        prescriptions = list(prescriptions_col.find(
            {"doctorId": ObjectId(user["user_id"])}
        ))

        # 2. Convert ALL ObjectIds to Strings
        for pres in prescriptions:
            pres["_id"] = str(pres["_id"])
            pres["patientId"] = str(pres["patientId"])
            pres["doctorId"] = str(pres["doctorId"])
            
            if "hospitalId" in pres:
                pres["hospitalId"] = str(pres["hospitalId"])
            if "appointmentId" in pres:
                pres["appointmentId"] = str(pres["appointmentId"])

        return prescriptions
    except Exception as e:
        raise HTTPException(500, f"Fetch failed: {str(e)}")

# Blockchain Access
from threading import Thread
from db import users_col
from blockchain_utils import blockchain_client

@router.get("/patient/{patient_id}")
def get_patient_prescriptions_doctor_view(patient_id: str, user=Depends(doctor_guard)):
    try:
        print(f"--> Received request for patient records: {patient_id}")
        doctor_id = user["user_id"]
        print(f"[DEBUG] Doctor {doctor_id} requesting records for {patient_id}")
        
        try:
            d_oid = ObjectId(doctor_id)
            p_oid = ObjectId(patient_id)
        except Exception as oid_err:
             print(f"[ERROR] Invalid ObjectId: {oid_err}")
             raise HTTPException(400, f"Invalid Patient or Doctor ID format: {oid_err}")

        # 1. Get Wallets
        doctor_doc = users_col.find_one({"_id": d_oid})
        patient_doc = users_col.find_one({"_id": p_oid})
        
        if not doctor_doc or not doctor_doc.get("wallet_address"):
            raise HTTPException(400, "Doctor wallet not linked.")
        
        if not patient_doc or not patient_doc.get("wallet_address"):
             raise HTTPException(400, "Patient wallet not linked.")
             
        doctor_wallet = doctor_doc["wallet_address"]
        patient_wallet = patient_doc["wallet_address"]
        
        # 2. Check Blockchain Access
        has_access = blockchain_client.check_access(patient_wallet, doctor_wallet)
        # print("⚠️ DEBUG: Bypassing Blockchain Check for Testing")
        # has_access = True
        
        if not has_access:
            error_msg = f"Access denied on Blockchain. Checked Patient: {patient_wallet} vs Doctor: {doctor_wallet}"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(403, error_msg)
            
        # 3. Log Access (Async)
        def log_task():
            blockchain_client.log_access(patient_wallet, doctor_wallet, f"View Records of {patient_id}")
            
        Thread(target=log_task).start()
        
        # 4. Fetch Data
        prescriptions = list(prescriptions_col.find(
            {"patientId": ObjectId(patient_id)}
        ))
        
        # Helper function to recursively convert MongoDB objects to JSON-serializable types
        def convert_mongo_doc(doc):
            """Recursively convert ObjectIds and datetimes in a document"""
            if isinstance(doc, dict):
                return {k: convert_mongo_doc(v) for k, v in doc.items()}
            elif isinstance(doc, list):
                return [convert_mongo_doc(item) for item in doc]
            elif isinstance(doc, ObjectId):
                return str(doc)
            elif isinstance(doc, datetime):
                return doc.isoformat()
            else:
                return doc
        
        # Convert all prescriptions
        prescriptions = [convert_mongo_doc(pres) for pres in prescriptions]
        
            
        return prescriptions
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in doctor view: {e}")
        raise HTTPException(500, f"Failed to access records: {str(e)}")