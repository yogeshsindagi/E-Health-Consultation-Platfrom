from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import users_col, hospitals_col

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/doctor/{doctor_id}")
def get_doctor_details(doctor_id: str):
    """Get doctor details by ID"""
    try:
        doctor = users_col.find_one({"_id": ObjectId(doctor_id), "role": "DOCTOR"})
        
        if not doctor:
            raise HTTPException(404, "Doctor not found")
        
        # Get hospital details
        hospital = hospitals_col.find_one({"hospitalId": doctor.get("hospitalId")})
        
        return {
            "_id": str(doctor["_id"]),
            "name": doctor.get("name", "Unknown"),
            "email": doctor.get("email", ""),
            "specialization": doctor.get("specialization", "General"),
            "licenseNumber": doctor.get("licenseNumber", ""),
            "hospitalId": doctor.get("hospitalId", ""),
            "hospitalName": hospital.get("hospitalName", "") if hospital else ""
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch doctor details: {str(e)}")

# Blockchain Wallet Linking
from pydantic import BaseModel
from fastapi import Depends
from eth_account import Account
from eth_account.messages import encode_defunct
from security import get_current_user

class WalletLinkRequest(BaseModel):
    walletAddress: str
    signature: str

@router.post("/link-wallet")
def link_wallet(data: WalletLinkRequest, user=Depends(get_current_user)):
    """
    Link a crypto wallet to the user account.
    Verifies that the signature matches 'Connect to E-Health: {user_id}'
    """
    try:
        user_id = user["user_id"]
        expected_msg = f"Connect to E-Health: {user_id}"
        message = encode_defunct(text=expected_msg)
        
        # Recover address
        recovered_address = Account.recover_message(message, signature=data.signature)
        
        if recovered_address.lower() != data.walletAddress.lower():
            raise HTTPException(400, "Signature verification failed. Wallet does not match signer.")
        
        # Update User in DB
        result = users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"wallet_address": recovered_address}}
        )
        
        if result.modified_count == 0:
             # Check if already set to the same?
             pass 

        return {"message": "Wallet linked successfully", "wallet": recovered_address}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Wallet linking failed: {str(e)}")
