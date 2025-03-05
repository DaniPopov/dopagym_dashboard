from fastapi import APIRouter, HTTPException
import logging
from models.scan import ScanRequest
from db.mongo_db import MongoDB

router = APIRouter(prefix="/api/v1/scan", tags=["scan"])
db = MongoDB()
logger = logging.getLogger(__name__)

@router.post("/scan-qr")
async def scan_qr(scan_request: ScanRequest):
    try:
        result = await db.scan_member_qr(scan_request.phone_number)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error in scan_qr: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-member-qr/{phone_number}")
async def scan_member(phone_number: str):
    return await db.scan_member_qr(phone_number)
