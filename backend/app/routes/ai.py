from fastapi import APIRouter

from app.models.schemas import AIRecommendation, MinimizedApplication
from app.services.ai_stub import recommend

router = APIRouter()


@router.post("/ai/recommend", response_model=AIRecommendation)
def ai_recommend(payload: MinimizedApplication) -> AIRecommendation:
    return recommend(payload)
