from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if "user_id" not in payload or "role" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        return payload

    except JWTError as e:
        print(f"[ERROR] JWT Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


def patient_guard(user=Depends(get_current_user)):
    try:
        if user.get("role") != "PATIENT":
            raise HTTPException(status_code=403, detail="Patient access only")
        return user
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))


def doctor_guard(user=Depends(get_current_user)):
    try:
        if user.get("role") != "DOCTOR":
            raise HTTPException(status_code=403, detail="Doctor access only")
        return user
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))


def hospital_admin_guard(user=Depends(get_current_user)):
    try:
        if user.get("role") != "HOSPITAL_ADMIN":
            raise HTTPException(status_code=403, detail="Hospital Admin access only")
        return user
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))


def system_admin_guard(user=Depends(get_current_user)):
    try:
        if user.get("role") != "SYSTEM_ADMIN":
            raise HTTPException(status_code=403, detail="System Admin access only")
        return user
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))
