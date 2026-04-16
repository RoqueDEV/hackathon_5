"""Routing logic: auto | review | rejected."""

from typing import Literal

from app.core.config import settings
from app.models.schemas import AIRecommendation, ApplicationIn, FairnessResult

Route = Literal["auto", "review", "rejected"]


def determine_route(
    app: ApplicationIn,
    ai: AIRecommendation,
    fairness: FairnessResult,
) -> Route:
    """Determine processing route per plan.md routing rules.

    route = "review" if any of:
    - severity == "hoog"
    - multipleProblems == True
    - ai.risk_level == "high"
    - fairness.flags is non-empty
    - ai.confidence < CONFIDENCE_THRESHOLD
    """
    if (
        app.severity == "hoog"
        or app.multipleProblems
        or ai.risk_level == "high"
        or len(fairness.flags) > 0
        or ai.confidence < settings.CONFIDENCE_THRESHOLD
    ):
        return "review"
    return "auto"
