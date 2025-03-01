from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Member(BaseModel):
    fullName: str
    idNumber: Optional[str] = None
    phone: str
    email: str
    membershipType: str
    weeklyTraining: str
    paymentMethod: str
    lastRenewal: Optional[datetime] = None
    lastVisit: Optional[datetime] = None
    paymentStatus: str = "paid"
    qrcode_image: Optional[str] = None  # Store as base64 string