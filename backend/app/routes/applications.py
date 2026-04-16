"""Main orchestration endpoint for WMO applications.

The POST /applications monolith is kept for legacy/fallback use.
Orchestration has moved to n8n.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.logging import get_logger
from app.models.schemas import (
    ApplicationIn,
    ApplicationResult,
    MinimizedApplication,
    PseudonymizeIn,
    PseudonymizeOut,
    RouteDecideRequest,
    RouteDecideResponse,
    ValidateResult,
)
from app.services import ai_stub, fairness, router as routing
from app.services.audit import write_audit_log, write_review_queue
from app.services.minimizer import minimize
from app.services.pseudonymizer import get_token

logger = get_logger(__name__)

router = APIRouter()


def _validate_application(app: ApplicationIn) -> list[str]:
    errors: list[str] = []
    if not app.citizenId:
        errors.append("citizenId is verplicht")
    if not app.name:
        errors.append("name is verplicht")
    if not app.problemSummary:
        errors.append("problemSummary is verplicht")
    return errors


def _build_citizen_message(route: str, provision_type: str, ai_was_used: bool) -> str:
    ai_note = (
        " Bij de beoordeling is AI-ondersteuning gebruikt om uw aanvraag voor te bereiden."
        if ai_was_used
        else ""
    )

    if route == "auto":
        return (
            f"Uw WMO-aanvraag voor '{provision_type}' is ontvangen en automatisch beoordeeld.{ai_note} "
            "U ontvangt binnen de wettelijke termijn een officieel besluit."
        )
    if route == "review":
        return (
            f"Uw WMO-aanvraag voor '{provision_type}' is ontvangen.{ai_note} "
            "Een medewerker van de gemeente kijkt mee en neemt uw aanvraag zorgvuldig door. "
            "U ontvangt zo spoedig mogelijk bericht."
        )
    # rejected
    return (
        f"Uw WMO-aanvraag voor '{provision_type}' kan helaas niet worden verwerkt. "
        "U heeft geen toestemming gegeven voor AI-ondersteuning. "
        "Neem contact op met de gemeente voor een beoordeling zonder AI."
    )


@router.post("/applications", response_model=ApplicationResult)
def submit_application(  # noqa: PLR0914 — Deprecated: orchestration moved to n8n.
    app: ApplicationIn,
    db: Session = Depends(get_db),
) -> ApplicationResult:
    application_id = str(uuid.uuid4())

    logger.info(
        "application_received",
        extra={"application_id": application_id, "provision_type": app.provisionType},
    )

    # Step 1: consent check
    if not app.consentForAI:
        citizen_token = get_token(app.citizenId)
        write_audit_log(
            db,
            application_id=application_id,
            citizen_token=citizen_token,
            provision_type=app.provisionType,
            severity=app.severity,
            route="rejected",
            risk_level="low",
            confidence=None,
            fairness_flags=[],
            final_decision_status="rejected_no_consent",
            problem_summary=app.problemSummary,
            ai_recommendation=None,
            ai_reasoning=None,
            ai_model=None,
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": "consent_required",
                "message": (
                    "Uw aanvraag kan niet worden verwerkt. "
                    "U heeft geen toestemming gegeven voor AI-ondersteuning (consentForAI=false). "
                    "Neem contact op met de gemeente voor verwerking zonder AI."
                ),
                "applicationId": application_id,
                "citizenToken": citizen_token,
                "route": "rejected",
            },
        )

    # Step 2: validation errors (non-consent)
    errors = _validate_application(app)
    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    # Step 3: pseudonymize
    citizen_token = get_token(app.citizenId)

    # Step 4: minimize (strip PII)
    minimized: MinimizedApplication = minimize(app)

    # Step 5: AI recommendation (no PII goes in)
    ai_result = ai_stub.recommend(minimized)

    # Step 6: fairness check
    fairness_result = fairness.check(ai_result)

    # Step 7: routing
    route = routing.determine_route(app, ai_result, fairness_result)

    # Step 8: audit log
    final_status = "pending_review" if route == "review" else "auto_approved"
    write_audit_log(
        db,
        application_id=application_id,
        citizen_token=citizen_token,
        provision_type=app.provisionType,
        severity=app.severity,
        route=route,
        risk_level=ai_result.risk_level,
        confidence=ai_result.confidence,
        fairness_flags=fairness_result.flags,
        final_decision_status=final_status,
        problem_summary=app.problemSummary,
        ai_recommendation=ai_result.recommendation,
        ai_reasoning=ai_result.reasoning,
        ai_model=ai_result.model,
    )

    # Step 9: add to review queue if needed
    if route == "review":
        write_review_queue(
            db,
            application_id=application_id,
            citizen_token=citizen_token,
            provision_type=app.provisionType,
            severity=app.severity,
            risk_level=ai_result.risk_level,
            fairness_flags=fairness_result.flags,
            problem_summary=app.problemSummary,
            ai_recommendation=ai_result.recommendation,
            ai_reasoning=ai_result.reasoning,
            confidence=ai_result.confidence,
            ai_model=ai_result.model,
        )

    # Step 10: citizen message
    citizen_message = _build_citizen_message(route, app.provisionType, ai_was_used=True)

    logger.info(
        "application_processed",
        extra={
            "application_id": application_id,
            "citizen_token": citizen_token,
            "route": route,
            "risk_level": ai_result.risk_level,
        },
    )

    return ApplicationResult(
        applicationId=uuid.UUID(application_id),
        citizenToken=citizen_token,
        route=route,
        citizenMessage=citizen_message,
        aiRecommendation=ai_result,
        fairnessFlags=fairness_result.flags,
        riskLevel=ai_result.risk_level,
    )


@router.post("/applications/validate", response_model=ValidateResult)
def validate_application(app: ApplicationIn) -> ValidateResult:
    errors = _validate_application(app)
    if not app.consentForAI:
        errors.append("consentForAI moet true zijn voor verwerking")
    return ValidateResult(valid=len(errors) == 0, errors=errors)


@router.post("/pseudonymize", response_model=PseudonymizeOut)
def pseudonymize_citizen(body: PseudonymizeIn) -> PseudonymizeOut:
    return PseudonymizeOut(token=get_token(body.citizenId))


@router.post("/minimize", response_model=MinimizedApplication)
def minimize_application(app: ApplicationIn) -> MinimizedApplication:
    return minimize(app)


@router.post("/route/decide", response_model=RouteDecideResponse)
def route_decide(body: RouteDecideRequest) -> RouteDecideResponse:
    """Determine processing route from aggregated signals."""
    from app.core.config import settings as _cfg

    needs_review = (
        body.severity == "hoog"
        or body.multipleProblems
        or body.risk_level == "high"
        or len(body.fairness_flags) > 0
        or body.confidence < _cfg.CONFIDENCE_THRESHOLD
    )

    if needs_review:
        reasons = []
        if body.severity == "hoog":
            reasons.append("severity=hoog")
        if body.multipleProblems:
            reasons.append("meervoudige problematiek")
        if body.risk_level == "high":
            reasons.append("AI risico=hoog")
        if body.fairness_flags:
            reasons.append(f"fairness flags: {', '.join(body.fairness_flags)}")
        if body.confidence < _cfg.CONFIDENCE_THRESHOLD:
            reasons.append(f"lage betrouwbaarheid ({body.confidence:.0%})")
        return RouteDecideResponse(route="review", reason="; ".join(reasons))

    return RouteDecideResponse(route="auto", reason="Geen bijzondere risicofactoren")
