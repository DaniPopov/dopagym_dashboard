import uvicorn
from fastapi import FastAPI, HTTPException
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
#app.add_middleware(
#    TrustedHostMiddleware,
#    allowed_hosts=["dopadash.com", "www.dopadash.com", "localhost", "127.0.0.1", "http://51.17.120.86:8000"]
#)


# Mount the static files directory
app.mount("/static", StaticFiles(directory="/app/frontend"), name="static")

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)