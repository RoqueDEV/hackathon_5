from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True, default=_uuid)
    citizen_token: Mapped[str] = mapped_column(sa.String, nullable=False, index=True)
    provision_type: Mapped[str] = mapped_column(sa.String, nullable=False)
    severity: Mapped[str] = mapped_column(sa.String, nullable=False)
    route: Mapped[str] = mapped_column(sa.String, nullable=False)
    consent_for_ai: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(sa.String, nullable=False, index=True)
    citizen_token: Mapped[str] = mapped_column(sa.String, nullable=False, index=True)
    provision_type: Mapped[str] = mapped_column(sa.String, nullable=False)
    severity: Mapped[str] = mapped_column(sa.String, nullable=False)
    route: Mapped[str] = mapped_column(sa.String, nullable=False)
    risk_level: Mapped[str] = mapped_column(sa.String, nullable=False)
    confidence: Mapped[float | None] = mapped_column(sa.Float, nullable=True)
    fairness_flags: Mapped[str] = mapped_column(sa.Text, nullable=False, default="[]")
    final_decision_status: Mapped[str] = mapped_column(sa.String, nullable=False)
    processing_purpose: Mapped[str] = mapped_column(sa.String, nullable=False, default="wmo_intake")
    retention_until: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
    problem_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String, nullable=True)


class ReviewQueue(Base):
    __tablename__ = "review_queue"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(sa.String, nullable=False, index=True)
    citizen_token: Mapped[str] = mapped_column(sa.String, nullable=False)
    provision_type: Mapped[str] = mapped_column(sa.String, nullable=False)
    severity: Mapped[str] = mapped_column(sa.String, nullable=False)
    risk_level: Mapped[str] = mapped_column(sa.String, nullable=False)
    fairness_flags: Mapped[str] = mapped_column(sa.Text, nullable=False, default="[]")
    status: Mapped[str] = mapped_column(sa.String, nullable=False, default="pending")
    assigned_to: Mapped[str | None] = mapped_column(sa.String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
    problem_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String, nullable=True)


class ReviewerDecision(Base):
    __tablename__ = "reviewer_decisions"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True, default=_uuid)
    review_queue_id: Mapped[str] = mapped_column(sa.String, sa.ForeignKey("review_queue.id"), nullable=False)
    application_id: Mapped[str] = mapped_column(sa.String, nullable=False, index=True)
    decision: Mapped[str] = mapped_column(sa.String, nullable=False)
    note: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    decided_at: Mapped[datetime] = mapped_column(sa.DateTime, default=datetime.utcnow)
