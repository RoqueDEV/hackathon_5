from datetime import date
from typing import Literal

from app.models.schemas import ApplicationIn, MinimizedApplication
from app.services.pseudonymizer import get_token


AgeGroup = Literal["<18", "18-25", "26-40", "41-65", "65+"]


def derive_age_group(dob: date) -> AgeGroup:
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 18:
        return "<18"
    if age <= 25:
        return "18-25"
    if age <= 40:
        return "26-40"
    if age <= 65:
        return "41-65"
    return "65+"


def minimize(app: ApplicationIn) -> MinimizedApplication:
    """Strip PII and derive privacy-safe fields."""
    token = get_token(app.citizenId)
    age_group = derive_age_group(app.dateOfBirth)
    household_size: int | None = None
    if isinstance(app.householdContext, dict):
        household_size = app.householdContext.get("size")

    return MinimizedApplication(
        citizenToken=token,
        ageGroup=age_group,
        provisionType=app.provisionType,
        problemSummary=app.problemSummary,
        severity=app.severity,
        mobilityIssues=app.mobilityIssues,
        multipleProblems=app.multipleProblems,
        householdSize=household_size,
    )
