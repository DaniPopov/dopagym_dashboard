from fastapi import APIRouter, HTTPException
import logging
from models import Member_BatYam
from mongo_batyam import MongoBatYam
from fastapi.responses import JSONResponse
from bson.objectid import ObjectId

router = APIRouter(prefix="/api/v1/members_batyam", tags=["members_batyam"])
db = MongoBatYam()
logger = logging.getLogger(__name__)



@router.post("/")
async def add_member(member: Member_BatYam):
    """Add a new member to the database"""
    try:
        # Basic validation - only check for required fields
        if not member.fullName:
            raise HTTPException(status_code=400, detail="שם מלא הוא שדה חובה")
        
        # Add member without checking for existing phone number
        result = await db.add_member(member)
        logger.info(f"✅ Member added at Mongo Bat Yam: {member}")
        return {"message": "Member added successfully", "id": result.get("id")}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Error adding member at Mongo Bat Yam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_all_members():
    """Get all members from the database"""
    try:
        members = await db.get_all_members()
        logger.info(f"✅ All members found at Mongo Bat Yam: {len(members)} members")
        return members
    except Exception as e:
        logger.error(f"❌ Error getting all members at Mongo Bat Yam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/id/{member_id}")
async def get_member_by_id(member_id: str):
    """Get a member by ID"""
    try:
        member = await db.get_member_by_id(member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        return member
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/id/{member_id}")
async def update_member_by_id(member_id: str, update_data: dict):
    """Update a member's details by ID"""
    try:
        # First get the member to check if it exists
        member = await db.get_member_by_id(member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Update the member
        success = await db.update_member(member_id, update_data)
        if success:
            return {"message": "Member updated successfully"}
        raise HTTPException(status_code=500, detail="Failed to update member")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Error updating member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/id/{member_id}")
async def patch_member_by_id(member_id: str, update_data: dict):
    """Update specific fields of a member by ID"""
    try:
        member = await db.get_member_by_id(member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        success = await db.update_member(member_id, update_data)
        if success:
            return {"message": "Member updated successfully"}
        raise HTTPException(status_code=500, detail="Failed to update member")
    except Exception as e:
        logger.error(f"❌ Error updating member: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/id/{member_id}")
async def delete_member_by_id(member_id: str):
    """Delete a specific member by ID"""
    try:
        success = await db.delete_member(member_id)
        if success:
            return {"message": "Member deleted successfully"}
        raise HTTPException(status_code=404, detail="Member not found")
    except Exception as e:
        logger.error(f"❌ Error deleting member: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete-all")
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


