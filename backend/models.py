from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ScanRequest(BaseModel):
    phone_number: str

class LoginData(BaseModel):
    username: str
    password: str

class Member(BaseModel):
    fullName: str
    idNumber: str
    phone: str
    email: str
    birthDate: str
    membershipType: str
    weeklyTraining: str
    paymentMethod: str
    subscriptionvalid: str
    lastVisit: str
    allVisits: List[str]
    paymentStatus: str
    membershipStatus: str
    qrcode_image: Optional[str] = None  # Base64 QR code image
    
    # Additional fields for future use
    emergency_contact: Optional[dict] = None
    notes: Optional[str] = None
    # TODO: add field for sauna --> int range 1-10 --> default 0
    # TODO: add field for massage --> int range 1-10 --> default 0
