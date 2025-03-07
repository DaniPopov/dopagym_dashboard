from fastapi import APIRouter, HTTPException
import logging
from models import ScanRequest
from mongo_db import MongoDB

router = APIRouter(prefix="/api/v1/scan", tags=["scan"])
db = MongoDB()
logger = logging.getLogger(__name__)

@router.post("/scan-qr")
async def scan_qr(scan_request: ScanRequest):
    """
    Scan a QR code - now expects member_id in the QR code
    """
    try:
        # The QR code now contains the member_id
        result = await db.scan_member_qr(scan_request.member_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error in scan_qr: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/record-visit")
async def record_visit_from_scan(scan_request: ScanRequest):
    """
    Record a visit after scanning a QR code
    """
    try:
        result = await db.record_member_visit(scan_request.member_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error recording visit: {e}")
        raise HTTPException(status_code=500, detail=str(e))

