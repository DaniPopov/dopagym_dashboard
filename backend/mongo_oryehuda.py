import os
import logging
from datetime import datetime, timedelta
import pytz

from typing import List, Optional
from pymongo import MongoClient
from bson import ObjectId
from models import Member_OrYehuda
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


class MongoOrYehuda:
    def get_weekly_entries_count(self):
        """
        Count the number of unique member entries (visits) for the current week (Sunday to Friday, inclusive).
        Returns the total number of entries (not unique members, but total visits).
        """
        try:
            israel_tz = pytz.timezone('Asia/Jerusalem')
            now = datetime.now(israel_tz)
            # Find the most recent Sunday
            start_of_week = now - timedelta(days=(now.weekday() + 1) % 7)
            start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            # End is Friday 23:59:59
            end_of_week = start_of_week + timedelta(days=5, hours=23, minutes=59, seconds=59)

            # Query allVisits arrays for entries in this range
            pipeline = [
                {"$unwind": "$allVisits"},
                {"$match": {
                    "allVisits": {
                        "$gte": start_of_week,
                        "$lte": end_of_week
                    }
                }}
            ]
            entries = list(self.members.aggregate(pipeline))
            return len(entries)
        except Exception as e:
            logger.error(f"❌ Error counting weekly entries: {e}")
            return 0

    def __init__(self):
        self.client = self._connect()
        self.db = self.client["dopamiengym_db"]
        self.members = self.db["members"]
        # Initialize EmailSender with credentials from environment variables
        self.email_sender = EmailSender(
            email=os.getenv("EMAIL_ADDRESS"),
            password=os.getenv("EMAIL_PASSWORD")
        )

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
            logger.info("✅ Connected to Mongo Or Yehuda")
            return client
        except Exception as e:
            logger.error(f"❌ Error connecting to Mongo Or Yehuda: {e}")
            raise e
        
    async def add_member(self, member: Member_OrYehuda) -> dict:
        """Add a new member to the database and generate a QR code."""
        try:
            israel_tz = pytz.timezone('Asia/Jerusalem')
            current_time_in_israel = datetime.now(israel_tz)
            formatted_time = current_time_in_israel.strftime('%Y-%m-%d')
            member_dict = member.dict()
            
            # Set timestamps
            member_dict.setdefault("lastVisit", formatted_time)
            member_dict.setdefault("allVisits", [formatted_time])
            
            # Insert member first to get the ID
            result = self.members.insert_one(member_dict)
            member_id = str(result.inserted_id)
            
            # Generate QR Code with member_id instead of phone
            qrcode_base64 = self.generate_qrcode(member_id)
            
            # Update the member with the QR code
            self.members.update_one(
                {"_id": ObjectId(member_id)},
                {"$set": {"qrcode_image": qrcode_base64}}
            )
            
            # For complex fields, still use appropriate defaults
            member_dict.setdefault("attendance_stats", {
                "total_visits": 0,
                "avg_weekly_visits": 0,
                "last_month_visits": 0
            })
            member_dict.setdefault("medical_info", {})

            # Send welcome email
            qrcode_bytes = base64.b64decode(qrcode_base64)
            email_sent = self.email_sender.send_welcome_email(
                to_email=member.email,
                member_name=member.fullName,
                barcode_image=qrcode_bytes
            )

            return {
                "id": member_id,
                "email_sent": email_sent,
                "qrcode": qrcode_base64
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

    async def get_member_by_phone(self, phone: str):
        try:
            from bson.objectid import ObjectId
            # PyMongo's find_one is not a coroutine, so don't use await here
            member = self.members.find_one({"phone": phone})
            if member:
                member["_id"] = str(member["_id"])  # Convert ObjectId to string
                return member
            return None
        except Exception as e:
            logger.error(f"❌ Error getting member by phone: {e}")
            raise e

    async def update_member(self, member_id: str, update_data: dict) -> bool:
        """Update a member's information"""
        try:
            result = self.members.update_one(
                {"_id": ObjectId(member_id)},  # Convert string ID to ObjectId
                {"$set": update_data}
            )
            logger.info(f"✅ Member updated at Mongo Or Yehuda: {result.modified_count} fields updated")
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Error updating member at Mongo Or Yehuda: {e}")
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

    async def update_last_visit(self, member_id: str) -> bool:
        """Update member's last visit time"""
        try:
            result = self.members.update_one(
                {"_id": member_id},
                {"$set": {"lastVisit": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Error updating last visit at Mongo Or Yehuda: {e}")
            raise e
        
    async def get_all_members(self) -> List[dict]:
        """Get all members from the database"""
        try:
            members = list(self.members.find())
            logger.info(f"✅ Members found at Mongo Or Yehuda: {members}")
            # Convert ObjectId to string for JSON serialization
            for member in members:
                member["_id"] = str(member["_id"])
            return members
        except Exception as e:
            logger.error(f"❌ Error getting members at Mongo Or Yehuda: {e}")
            raise e

    def generate_qrcode(self, member_id: str) -> str:
        """Generate a QR code with member_id and return base64 string."""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4
            )
            
            # Use member_id instead of phone number
            qr.add_data(member_id)
            qr.make(fit=True)

            # Create an image from the QR Code
            img = qr.make_image(fill="black", back_color="white")

            # Convert image to bytes
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            
            # Convert to base64 for storage
            qrcode_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.info(f"✅ Generated QR code for member ID: {member_id}")
            return qrcode_base64

        except Exception as e:
            logger.error(f"❌ Error generating QR code: {e}")
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

    async def scan_member_qr(self, member_id: str) -> dict:
        """
        Process a QR code scan for a member using member_id.
        Returns the member data without updating the visit yet.
        """
        try:
            # Get the member data
            member = await self.get_member_by_id(member_id)
            
            if not member:
                raise HTTPException(status_code=404, detail="Member not found")
            
            return member
        except Exception as e:
            logger.error(f"Error scanning member QR: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error scanning member QR: {str(e)}")

    async def record_member_visit(self, member_id: str) -> dict:
        """
        Record a visit for a member after scanning their QR code.
        Now uses member_id instead of phone number.
        """
        try:
            # Get the member data
            member = await self.get_member_by_id(member_id)
            
            if not member:
                raise HTTPException(status_code=404, detail="Member not found")
            
            # Update the visit information
            current_time = datetime.now()
            
            # Update the member's visit data
            update_data = {
                "lastVisit": current_time
            }
            
            # Add to allVisits array
            if "allVisits" in member and member["allVisits"]:
                all_visits = member["allVisits"]
                all_visits.append(current_time)
                update_data["allVisits"] = all_visits
            else:
                update_data["allVisits"] = [current_time]
            
            # Update the member record using ID
            result = self.members.update_one(
                {"_id": ObjectId(member_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to update member visit")
            
            return {"success": True, "message": "Visit recorded successfully"}
        except Exception as e:
            logger.error(f"Error recording member visit: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error recording member visit: {str(e)}")

    # Add function to get member QR code by ID
    async def get_member_qrcode_by_id(self, member_id: str) -> dict:
        try:
            member = await self.get_member_by_id(member_id)
            if not member:
                raise ValueError("Member not found")
            
            return {
                "qrcode": member.get("qrcode_image"),
                "member_name": member.get("fullName")
            }
        except Exception as e:
            logger.error(f"❌ Error retrieving QR code at Mongo Or Yehuda: {e}")
            raise e


