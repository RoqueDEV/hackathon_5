from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.schemas import CitizenData
from app.services.audit import get_citizen_audit_records

router = APIRouter()


@router.get("/citizen/{token}/data", response_model=CitizenData)
def get_citizen_data(token: str, db: Session = Depends(get_db)) -> CitizenData:
    records = get_citizen_audit_records(db, citizen_token=token)
    return CitizenData(citizenToken=token, applications=records)
