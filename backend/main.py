import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Cookie
from fastapi.middleware.cors import CORSMiddleware
from mongo_db import MongoDB
from models import Member
from typing import List
import logging
from pydantic import BaseModel
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Authentication settings
SECRET_KEY = "q1e3w2r4"  # Change this!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI()
db = MongoDB()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dopadash.com", "https://www.dopadash.com"],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Mount the static files directory
app.mount("/static", StaticFiles(directory="/app/frontend"), name="static")

# Authentication classes and setup
class Token(BaseModel):
    access_token: str
    token_type: str

class UserInDB(BaseModel):
    username: str
    hashed_password: str

# Mock user database - replace with real DB in production
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": "admin1234"  # "password123"
    }
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# Page routes
@app.get("/")
@app.get("/main_page")
async def main_page():
    return FileResponse("/app/frontend/main_page/index.html")

@app.get("/enter_member")
async def enter_member():
    return FileResponse("/app/frontend/enter_member/index.html")

@app.get("/all_members")
async def all_members():
    return FileResponse("/app/frontend/all_members/index.html")

@app.get("/scan_qr")
async def scan_qr():
    return FileResponse("/app/frontend/scan_qr/index.html")

class ScanRequest(BaseModel):
    phone_number: str

@app.post("/api/members")
async def add_member(member: Member):
    try:
        # Basic validation
        if not member.phone or not member.fullName:
            raise HTTPException(status_code=400, detail="שם מלא ומספר טלפון הם שדות חובה")
        
        # Check if phone number already exists
        existing_member = await db.get_member(member.phone)
        if existing_member:
            raise HTTPException(status_code=400, detail="מספר טלפון זה כבר קיים במערכת")

        # Add member
        result = await db.add_member(member)
        logger.info(f"✅ Member added: {member}")
        return {"message": "Member added successfully", "id": result.get("id")}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Error adding member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/members/{phone_number}")
async def get_member(phone_number: str):
    try:
        member = await db.get_member(phone_number)
        logger.info(f"✅ Member found: {member}")
        return member
    except Exception as e:
        logger.error(f"❌ Error getting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/members/delete-all")
async def delete_all_members():
    """Delete all members from the database"""
    try:
        result = await db.delete_all_members()
        return result
    except Exception as e:
        logger.error(f"❌ Error in delete_all_members: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete all members: {str(e)}"
        )

@app.delete("/api/members/{member_id}")
async def delete_member(member_id: str):
    """Delete a specific member"""
    try:
        success = await db.delete_member(member_id)
        if success:
            return {"message": "Member deleted successfully"}
        raise HTTPException(status_code=404, detail="Member not found")
    except Exception as e:
        logger.error(f"❌ Error deleting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/members")
async def get_all_members():
    try:
        members = await db.get_all_members()
        logger.info(f"✅ All members found: {members}")
        return members
    except Exception as e:
        logger.error(f"❌ Error getting all members: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan-qr")
async def scan_qr(scan_request: ScanRequest):
    try:
        result = await db.scan_member_qr(scan_request.phone_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error in scan_qr: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Authentication functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

# Login route (unprotected)
@app.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_users_db.get(form_data.username)
    if not user or not pwd_context.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="שם משתמש או סיסמה שגויים")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"token": access_token, "token_type": "bearer"}

# Login page route (unprotected)
@app.get("/login")
async def login_page():
    return FileResponse("/app/frontend/login/index.html")

# Protected page routes
@app.get("/")
@app.get("/main_page")
async def main_page(current_user: str = Depends(get_current_user)):
    return FileResponse("/app/frontend/main_page/index.html")

@app.get("/enter_member")
async def enter_member(current_user: str = Depends(get_current_user)):
    return FileResponse("/app/frontend/enter_member/index.html")

@app.get("/all_members")
async def all_members(current_user: str = Depends(get_current_user)):
    return FileResponse("/app/frontend/all_members/index.html")

@app.get("/scan_qr")
async def scan_qr(current_user: str = Depends(get_current_user)):
    return FileResponse("/app/frontend/scan_qr/index.html")

# Protected API routes
@app.post("/api/members")
async def add_member(member: Member, current_user: str = Depends(get_current_user)):
    try:
        if not member.phone or not member.fullName:
            raise HTTPException(status_code=400, detail="שם מלא ומספר טלפון הם שדות חובה")
        
        existing_member = await db.get_member(member.phone)
        if existing_member:
            raise HTTPException(status_code=400, detail="מספר טלפון זה כבר קיים במערכת")

        result = await db.add_member(member)
        logger.info(f"✅ Member added: {member}")
        return {"message": "Member added successfully", "id": result.get("id")}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Error adding member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/members/{phone_number}")
async def get_member(phone_number: str, current_user: str = Depends(get_current_user)):
    try:
        member = await db.get_member(phone_number)
        logger.info(f"✅ Member found: {member}")
        return member
    except Exception as e:
        logger.error(f"❌ Error getting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/members/delete-all")
async def delete_all_members(current_user: str = Depends(get_current_user)):
    try:
        result = await db.delete_all_members()
        return result
    except Exception as e:
        logger.error(f"❌ Error in delete_all_members: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete all members: {str(e)}"
        )

@app.delete("/api/members/{member_id}")
async def delete_member(member_id: str, current_user: str = Depends(get_current_user)):
    try:
        success = await db.delete_member(member_id)
        if success:
            return {"message": "Member deleted successfully"}
        raise HTTPException(status_code=404, detail="Member not found")
    except Exception as e:
        logger.error(f"❌ Error deleting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/members")
async def get_all_members(current_user: str = Depends(get_current_user)):
    try:
        members = await db.get_all_members()
        logger.info(f"✅ All members found: {members}")
        return members
    except Exception as e:
        logger.error(f"❌ Error getting all members: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan-qr")
async def scan_qr(scan_request: ScanRequest, current_user: str = Depends(get_current_user)):
    try:
        result = await db.scan_member_qr(scan_request.phone_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error in scan_qr: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)