import os
import logging
from datetime import datetime, timedelta
import pytz

from typing import List, Optional
from pymongo import MongoClient
from bson import ObjectId
from models import Member_BatYam
from dotenv import load_dotenv

import qrcode
from io import BytesIO
import base64

from io import BytesIO
import base64
from utils import EmailSender
from fastapi import HTTPException

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MongoBatYam:
    def __init__(self):
        self.client = self._connect()
        self.db = self.client["dopamiengym_db"]
        self.members = self.db["bat_yam_members"] # collection name

    def _connect(self):
        try:
            
            mongo_uri = os.getenv("MONGO_URI")

            logger.info(f"Current working directory: {os.getcwd()}")
            logger.info(f"MONGO_URI present: {mongo_uri is not None}")

            if not mongo_uri:
                raise ValueError("MONGO_URI environment variable not set")
            
            client = MongoClient(mongo_uri)
            # Test the connection
            client.admin.command('ping')
            logger.info("✅ Connected to MongoDB Atlas")
            return client
        except Exception as e:
            logger.error(f"❌ Error connecting to MongoDB: {e}")
            raise e
        
    async def add_member(self, member: Member_BatYam) -> dict:
        """Add a new member to the database and generate a QR code."""
        try:
            member_dict = member.dict()
            
            # Insert member first to get the ID
            result = self.members.insert_one(member_dict)
            member_id = str(result.inserted_id)
            
            return {
                "id": member_id,
            }

        except Exception as e:
            logger.error(f"❌ Error adding member: {e}")
            raise e

    async def get_member_by_id(self, member_id: str):
        try:
            from bson.objectid import ObjectId
            # PyMongo's find_one is not a coroutine, so don't use await here
            member = self.members.find_one({"_id": ObjectId(member_id)})
            if member:
                member["_id"] = str(member["_id"])  # Convert ObjectId to string
                return member
            return None
        except Exception as e:
            logger.error(f"❌ Error getting member by ID: {e}")
            raise e


    async def update_member(self, member_id: str, update_data: dict) -> bool:
        """Update a member's information"""
        try:
            result = self.members.update_one(
                {"_id": ObjectId(member_id)},  # Convert string ID to ObjectId
                {"$set": update_data}
            )
            logger.info(f"✅ Member updated: {result.modified_count} fields updated")
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Error updating member: {e}")
            raise e

    async def delete_member(self, member_id: str) -> bool:
        """Delete a member from the database"""
        try:
            result = self.members.delete_one({"_id": ObjectId(member_id)})
            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted member with ID: {member_id}")
            else:
                logger.warning(f"No member found with ID: {member_id}")
            return success
        except Exception as e:
            logger.error(f"Error deleting member: {e}")
            raise e
        
    async def get_all_members(self) -> List[dict]:
        """Get all members from the database"""
        try:
            members = list(self.members.find())
            logger.info(f"✅ Members found: {members}")
            # Convert ObjectId to string for JSON serialization
            for member in members:
                member["_id"] = str(member["_id"])
            return members
        except Exception as e:
            logger.error(f"❌ Error getting members: {e}")
            raise e


    async def delete_all_members(self) -> dict:
        """Delete all members from the database"""
        try:
            result = self.members.delete_many({})
            deleted_count = result.deleted_count
            logger.info(f"✅ Deleted {deleted_count} members from database")
            return {
                "success": True,
                "deleted_count": deleted_count,
                "message": f"Successfully deleted {deleted_count} members"
            }
        except Exception as e:
            logger.error(f"❌ Error deleting all members: {e}")
            raise e


