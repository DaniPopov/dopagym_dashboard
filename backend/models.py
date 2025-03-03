from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class Member(BaseModel):
    fullName: str
    idNumber: Optional[str] = None
    phone: str
    email: str
    birthDate: Optional[datetime] = None
    membershipType: str
    weeklyTraining: str
    paymentMethod: str
    subscriptionvalid: Optional[datetime] = None
    lastVisit: Optional[datetime] = None
    allVisits: Optional[List[datetime]] = None
    paymentStatus: str = "paid"
    qrcode_image: Optional[str] = None  # Store as base64 string
    accountStatus: str = "active"  # New field: 'active' or 'frozen'