from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ScanRequest(BaseModel):
    phone_number: str

class LoginData(BaseModel):
    username: str
    password: str

class Member_OrYehuda(BaseModel):
    fullName: str
    idNumber: str
    phone: str
    email: str
    birthDate: str
    membershipType: str
    weeklyTraining: str
    paymentMethod: str
    subscriptionvalid: str
    lastVisit: Optional[str] = None  # Make lastVisit optional with None as default
    allVisits: List[str] = []  # Make allVisits optional with empty list as default
    paymentStatus: str
    membershipStatus: str
    qrcode_image: Optional[str] = None  # Base64 QR code image
    
    # Additional fields for future use
    emergency_contact: Optional[dict] = None
    notes: Optional[str] = None
    # TODO: add field for sauna --> int range 1-10 --> default 0
    # TODO: add field for massage --> int range 1-10 --> default 0

class Member_BatYam(BaseModel):
    fullName: str
    phone: str
    phone2: Optional[str] = None
    type_membership: str # boxing or wrestling
    payment_method: str # cash or card
    payment_date: str
    payment_status: str # paid or unpaid
    weeklyTraining: Optional[str] = None  # 250, 350, or 450
    notes: Optional[str] = None  # For storing additional notes about the member

