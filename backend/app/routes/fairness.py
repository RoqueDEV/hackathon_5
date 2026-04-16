from fastapi import APIRouter

from app.models.schemas import AIRecommendation, FairnessResult
from app.services.fairness import check

router = APIRouter()


@router.post("/fairness/check", response_model=FairnessResult)
def fairness_check(payload: AIRecommendation) -> FairnessResult:
    return check(payload)
