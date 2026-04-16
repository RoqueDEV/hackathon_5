from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.schemas import AuditRecord, AuditWriteRequest
from app.services.audit import (
    get_audit_by_application,
    get_audit_records,
    write_audit_log,
    write_review_queue,
)

router = APIRouter()


@router.post("/audit/write", response_model=AuditRecord)
def audit_write(body: AuditWriteRequest, db: Session = Depends(get_db)) -> AuditRecord:
    """Persist audit record and (if route==review) enqueue for human review."""
    import uuid as _uuid

    from app.services.audit import _audit_log_to_schema

    application_id = body.applicationId or str(_uuid.uuid4())

    log = write_audit_log(
        db,
        application_id=application_id,
        citizen_token=body.citizenToken,
        provision_type=body.provisionType,
        severity=body.severity,
        route=body.route,
        risk_level=body.riskLevel,
        confidence=body.confidence,
        fairness_flags=body.fairnessFlags,
        final_decision_status=body.finalDecisionStatus,
        problem_summary=body.problemSummary,
        ai_recommendation=body.aiRecommendation,
        ai_reasoning=body.aiReasoning,
        ai_model=body.aiModel,
    )

    if body.route == "review":
        write_review_queue(
            db,
            application_id=application_id,
            citizen_token=body.citizenToken,
            provision_type=body.provisionType,
            severity=body.severity,
            risk_level=body.riskLevel,
            fairness_flags=body.fairnessFlags,
            problem_summary=body.problemSummary,
            ai_recommendation=body.aiRecommendation,
            ai_reasoning=body.aiReasoning,
            confidence=body.confidence,
            ai_model=body.aiModel,
        )

    return _audit_log_to_schema(log)


@router.get("/audit", response_model=list[AuditRecord])
def list_audit(
    provision: Optional[str] = None,
    route: Optional[str] = None,
    risk: Optional[str] = None,
    flag: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[AuditRecord]:
    return get_audit_records(db, provision=provision, route=route, risk=risk, flag=flag)


@router.get("/audit/{application_id}", response_model=AuditRecord)
def get_audit(application_id: str, db: Session = Depends(get_db)) -> AuditRecord:
    record = get_audit_by_application(db, application_id)
    if not record:
        raise HTTPException(status_code=404, detail="Auditrecord niet gevonden")
    return record
