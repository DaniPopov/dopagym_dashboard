import os
import logging
from datetime import datetime, timedelta
import pytz

from typing import List, Optional
from pymongo import MongoClient
from bson import ObjectId
from models import Member
from dotenv import load_dotenv

import qrcode
from io import BytesIO
import base64

from io import BytesIO
import base64
from send_email import EmailSender
from fastapi import HTTPException

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_qrcode(phone_number: str) -> str:
    """Generate a QR code with phone number and return base64 string."""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4
        )
        
        # Use phone number instead of member_id
        qr.add_data(phone_number)
        qr.make(fit=True)

        # Create an image from the QR Code
        img = qr.make_image(fill="black", back_color="white")

        # Convert image to bytes
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        
        # Convert to base64 for storage
        qrcode_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        logger.info(f"✅ Generated QR code for phone number: {phone_number}")
        return qrcode_base64

    except Exception as e:
        logger.error(f"❌ Error generating QR code: {e}")
        raise e

class MongoDB:
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
            logger.info("✅ Connected to MongoDB Atlas")
            return client
        except Exception as e:
            logger.error(f"❌ Error connecting to MongoDB: {e}")
            raise e
        
    async def add_member(self, member: Member) -> dict:
        """Add a new member to the database and generate a QR code."""
        try:
            
            # Convert to Israel time
            israel_tz = pytz.timezone('Asia/Jerusalem')
            current_time_in_israel = datetime.now(israel_tz)
            formatted_time = current_time_in_israel.strftime('%Y-%m-%d')
            member_dict = member.dict()
            
            # Set timestamps if not provided
            member_dict.setdefault("lastVisit", formatted_time)
            member_dict.setdefault("allVisits", [formatted_time])

            # Insert the new member
            result = self.members.insert_one(member_dict)
            member_id = str(result.inserted_id)

            # Generate QR Code using phone number instead of ID
            qrcode_base64 = generate_qrcode(member.phone)

            # Update member in MongoDB with QR code
            self.members.update_one(
                {"_id": result.inserted_id},
                {"$set": {"qrcode_image": qrcode_base64}}
            )

            # For email, convert base64 back to bytes
            qrcode_bytes = base64.b64decode(qrcode_base64)

            # Send welcome email with the QR Code
            email_sent = self.email_sender.send_welcome_email(
                to_email=member.email,
                member_name=member.fullName,
                barcode_image=qrcode_bytes
            )

            if not email_sent:
                logger.warning(f"⚠️ Failed to send welcome email to {member.email}")

            return {
                "id": member_id, 
                "email_sent": email_sent,
                "qrcode": qrcode_base64
            }

        except Exception as e:
            logger.error(f"❌ Error adding member: {e}")
            raise e
                
    async def get_member(self, phone: str) -> Optional[dict]:
        """Retrieve a member by phone number, including their QR code."""
        try:
            member = self.members.find_one({"phone": phone})
            if member:
                member["_id"] = str(member["_id"])
            return member
        except Exception as e:
            logger.error(f"Error getting member: {e}")
            raise e
        
    async def update_member(self, phone_number: str, update_data: dict) -> bool:
        """Update a member's information"""
        # TODO: childern dosnt have id 
        try:
            result = self.members.update_one(
                {"phone": phone_number},
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

    async def update_last_visit(self, phone_number: str) -> bool:
        """Update member's last visit time"""
        try:
            result = self.members.update_one(
                {"phone": phone_number},
                {"$set": {"lastVisit": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"❌ Error updating last visit: {e}")
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

    def generate_barcode(self, member_id: str) -> tuple[str, bytes]:
        """Generate a barcode and return both the code and image bytes"""
        try:
            # Get the barcode class
            EAN = barcode.get_barcode_class('code128')
            ean = EAN(member_id, writer=ImageWriter())
            
            # Save barcode as an image
            buffer = BytesIO()
            ean.write(buffer)
            
            # Get the image bytes
            buffer.seek(0)  # Reset buffer position to start
            barcode_image = buffer.getvalue()
            
            # Get the barcode string
            barcode_string = ean.get_fullcode()
            
            # Store base64 version in database
            barcode_image_base64 = base64.b64encode(barcode_image).decode('utf-8')
            
            logger.info(f"✅ Generated barcode for member ID: {member_id}")
            return barcode_string, barcode_image

        except Exception as e:
            logger.error(f"❌ Error generating barcode: {e}")
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

    async def scan_member_qr(self, phone_number: str) -> dict:
        """
        Process a QR code scan for a member.
        Returns the member data without updating the visit yet.
        """
        try:
            # Get the member data
            member = await self.get_member(phone_number)
            
            if not member:
                raise HTTPException(status_code=404, detail="Member not found")
            
            return member
        except Exception as e:
            logger.error(f"Error scanning member QR: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error scanning member QR: {str(e)}")

    async def record_member_visit(self, phone_number: str) -> dict:
        """
        Record a visit for a member after scanning their QR code.
        """
        try:
            # Get the member data
            member = await self.get_member(phone_number)
            
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
            
            # Update the member record
            result = await self.update_member(phone_number, update_data)
            
            if not result:
                raise HTTPException(status_code=500, detail="Failed to update member visit")
            
            return {"success": True, "message": "Visit recorded successfully"}
        except Exception as e:
            logger.error(f"Error recording member visit: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error recording member visit: {str(e)}")