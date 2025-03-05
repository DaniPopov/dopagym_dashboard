from pydantic import BaseModel


class ScanRequest(BaseModel):
    phone_number: str
