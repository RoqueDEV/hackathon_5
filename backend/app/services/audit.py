"""Audit log and review queue helpers."""

import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.db_models import AuditLog, ReviewQueue, ReviewerDecision
from app.models.schemas import (
    AIRecommendation,
    AuditRecord,
    FairnessResult,
    ReviewItem,
)


def _now() -> datetime:
    return datetime.utcnow()


def write_audit_log(
    db: Session,
    *,
    application_id: str,
    citizen_token: str,
    provision_type: str,
    severity: str,
    route: str,
    risk_level: str,
    confidence: Optional[float],
    fairness_flags: list[str],
    final_decision_status: str,
    problem_summary: Optional[str] = None,
    ai_recommendation: Optional[str] = None,
    ai_reasoning: Optional[str] = None,
    ai_model: Optional[str] = None,
) -> AuditLog:
    retention_until = _now() + timedelta(days=settings.RETENTION_DAYS)
    record = AuditLog(
        id=str(uuid.uuid4()),
        application_id=application_id,
        citizen_token=citizen_token,
        provision_type=provision_type,
        severity=severity,
        route=route,
        risk_level=risk_level,
        confidence=confidence,
        fairness_flags=json.dumps(fairness_flags),
        final_decision_status=final_decision_status,
        processing_purpose="wmo_intake",
        retention_until=retention_until,
        created_at=_now(),
        problem_summary=problem_summary,
        ai_recommendation=ai_recommendation,
        ai_reasoning=ai_reasoning,
        ai_confidence=confidence,
        ai_model=ai_model,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def write_review_queue(
    db: Session,
    *,
    application_id: str,
    citizen_token: str,
    provision_type: str,
    severity: str,
    risk_level: str,
    fairness_flags: list[str],
    problem_summary: Optional[str] = None,
    ai_recommendation: Optional[str] = None,
    ai_reasoning: Optional[str] = None,
    confidence: Optional[float] = None,
    ai_model: Optional[str] = None,
) -> ReviewQueue:
    item = ReviewQueue(
        id=str(uuid.uuid4()),
        application_id=application_id,
        citizen_token=citizen_token,
        provision_type=provision_type,
        severity=severity,
        risk_level=risk_level,
        fairness_flags=json.dumps(fairness_flags),
        status="pending",
        created_at=_now(),
        problem_summary=problem_summary,
        ai_recommendation=ai_recommendation,
        ai_reasoning=ai_reasoning,
        ai_confidence=confidence,
        ai_model=ai_model,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _audit_log_to_schema(log: AuditLog) -> AuditRecord:
    return AuditRecord(
        id=uuid.UUID(log.id),
        applicationId=uuid.UUID(log.application_id),
        citizenToken=log.citizen_token,
        provisionType=log.provision_type,
        severity=log.severity,
        route=log.route,
        riskLevel=log.risk_level,
        confidence=log.confidence,
        fairnessFlags=json.loads(log.fairness_flags),
        finalDecisionStatus=log.final_decision_status,
        processingPurpose=log.processing_purpose,
        retentionUntil=log.retention_until,
        createdAt=log.created_at,
        problemSummary=log.problem_summary,
        aiRecommendation=log.ai_recommendation,
        aiReasoning=log.ai_reasoning,
        aiModel=log.ai_model,
    )


def _review_item_to_schema(item: ReviewQueue, decision: Optional[ReviewerDecision] = None) -> ReviewItem:
    return ReviewItem(
        id=uuid.UUID(item.id),
        applicationId=uuid.UUID(item.application_id),
        citizenToken=item.citizen_token,
        provisionType=item.provision_type,
        severity=item.severity,
        riskLevel=item.risk_level,
        fairnessFlags=json.loads(item.fairness_flags),
        status=item.status,
        assignedTo=item.assigned_to,
        createdAt=item.created_at,
        decision=decision.decision if decision else None,
        note=decision.note if decision else None,
        decidedAt=decision.decided_at if decision else None,
        problemSummary=item.problem_summary,
        aiRecommendation=item.ai_recommendation,
        aiReasoning=item.ai_reasoning,
        confidence=item.ai_confidence,
        aiModel=item.ai_model,
    )


def get_audit_records(
    db: Session,
    *,
    provision: Optional[str] = None,
    route: Optional[str] = None,
    risk: Optional[str] = None,
    flag: Optional[str] = None,
) -> list[AuditRecord]:
    query = db.query(AuditLog)
    if provision:
        query = query.filter(AuditLog.provision_type == provision)
    if route:
        query = query.filter(AuditLog.route == route)
    if risk:
        query = query.filter(AuditLog.risk_level == risk)
    if flag:
        query = query.filter(AuditLog.fairness_flags.contains(flag))
    return [_audit_log_to_schema(log) for log in query.all()]


def get_audit_by_application(db: Session, application_id: str) -> Optional[AuditRecord]:
    log = db.query(AuditLog).filter(AuditLog.application_id == application_id).first()
    if not log:
        return None
    return _audit_log_to_schema(log)


def get_review_queue(db: Session, status: Optional[str] = None) -> list[ReviewItem]:
    query = db.query(ReviewQueue)
    if status:
        query = query.filter(ReviewQueue.status == status)
    items = query.all()
    result = []
    for item in items:
        decision = (
            db.query(ReviewerDecision)
            .filter(ReviewerDecision.review_queue_id == item.id)
            .first()
        )
        result.append(_review_item_to_schema(item, decision))
    return result


def apply_review_decision(
    db: Session,
    application_id: str,
    decision: str,
    note: Optional[str],
) -> Optional[ReviewItem]:
    item = db.query(ReviewQueue).filter(ReviewQueue.application_id == application_id).first()
    if not item:
        return None
    item.status = decision
    rev_decision = ReviewerDecision(
        id=str(uuid.uuid4()),
        review_queue_id=item.id,
        application_id=application_id,
        decision=decision,
        note=note,
        decided_at=_now(),
    )
    db.add(rev_decision)
    # Update audit log final decision
    log = db.query(AuditLog).filter(AuditLog.application_id == application_id).first()
    if log:
        log.final_decision_status = decision
    db.commit()
    db.refresh(item)
    return _review_item_to_schema(item, rev_decision)


def get_citizen_audit_records(db: Session, citizen_token: str) -> list[AuditRecord]:
    logs = db.query(AuditLog).filter(AuditLog.citizen_token == citizen_token).all()
    return [_audit_log_to_schema(log) for log in logs]
