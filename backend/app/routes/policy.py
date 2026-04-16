from fastapi import APIRouter, HTTPException

from app.models.schemas import PolicyRule
from app.services.policy import get_policy

router = APIRouter()


@router.get("/policy/{provision_type}", response_model=PolicyRule)
def read_policy(provision_type: str) -> PolicyRule:
    rule = get_policy(provision_type)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Geen beleid gevonden voor '{provision_type}'")
    return rule
