from fastapi import APIRouter, HTTPException
import logging
from models.member import Member
from db.mongo_db import MongoDB

router = APIRouter(prefix="/api/v1/members", tags=["members"])
db = MongoDB()
logger = logging.getLogger(__name__)

@router.post("/add-member")
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

@router.get("/get-member/{phone_number}")
async def get_member(phone_number: str):
    try:
        member = await db.get_member(phone_number)
        logger.info(f"✅ Member found: {member}")
        return member
    except Exception as e:
        logger.error(f"❌ Error getting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-all-members")
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

@router.delete("/delete-member/{member_id}")
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

@router.get("/get-all-members")
async def get_all_members():
    try:
        members = await db.get_all_members()
        logger.info(f"✅ All members found: {members}")
        return members
    except Exception as e:
        logger.error(f"❌ Error getting all members: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/record-visit/{phone_number}")
async def record_visit(phone_number: str):
    return await db.record_member_visit(phone_number)
