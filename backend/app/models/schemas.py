from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Inbound
# ---------------------------------------------------------------------------

class ApplicationIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    citizenId: str
    name: str
    address: str
    dateOfBirth: date
    consentForAI: bool
    provisionType: Literal["huishoudelijke_hulp", "rolstoel", "woningaanpassing"]
    problemSummary: str
    severity: Literal["laag", "midden", "hoog"]
    householdContext: dict[str, Any] = Field(default_factory=dict)
    mobilityIssues: bool = False
    multipleProblems: bool = False
    submittedAt: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Minimized (no PII)
# ---------------------------------------------------------------------------

class MinimizedApplication(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    citizenToken: str
    ageGroup: Literal["<18", "18-25", "26-40", "41-65", "65+"]
    provisionType: Literal["huishoudelijke_hulp", "rolstoel", "woningaanpassing"]
    problemSummary: str
    severity: Literal["laag", "midden", "hoog"]
    mobilityIssues: bool
    multipleProblems: bool
    householdSize: Optional[int] = None


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------

class AIRecommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    recommendation: str
    reasoning: str
    confidence: float
    risk_level: Literal["low", "medium", "high"]
    model: str = "stub-v1"


# ---------------------------------------------------------------------------
# Fairness
# ---------------------------------------------------------------------------

class FairnessResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    passed: bool
    flags: list[str]
    severity: Literal["low", "medium", "high"]


# ---------------------------------------------------------------------------
# Policy
# ---------------------------------------------------------------------------

class PolicyRule(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provisionType: str
    maxHoursPerWeek: Optional[int] = None
    eligibilityCriteria: list[str]
    requiredDocuments: list[str]
    processingTimeDays: int
    reviewRequired: bool


# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------

class ApplicationResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    applicationId: UUID
    citizenToken: str
    route: Literal["auto", "review", "rejected"]
    citizenMessage: str
    aiRecommendation: Optional[AIRecommendation] = None
    fairnessFlags: list[str]
    riskLevel: Literal["low", "medium", "high"]


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------

class ReviewItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    applicationId: UUID
    citizenToken: str
    provisionType: str
    severity: str
    riskLevel: str
    fairnessFlags: list[str]
    status: Literal["pending", "approved", "rejected", "more_info"]
    assignedTo: Optional[str] = None
    createdAt: datetime
    decision: Optional[str] = None
    note: Optional[str] = None
    decidedAt: Optional[datetime] = None
    problemSummary: Optional[str] = None
    aiRecommendation: Optional[str] = None
    aiReasoning: Optional[str] = None
    confidence: Optional[float] = None
    aiModel: Optional[str] = None


class ReviewDecisionIn(BaseModel):
    decision: Literal["approved", "rejected", "more_info"]
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

class AuditRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    applicationId: UUID
    citizenToken: str
    provisionType: str
    severity: str
    route: str
    riskLevel: str
    confidence: Optional[float] = None
    fairnessFlags: list[str]
    finalDecisionStatus: str
    processingPurpose: str
    retentionUntil: datetime
    createdAt: datetime
    problemSummary: Optional[str] = None
    aiRecommendation: Optional[str] = None
    aiReasoning: Optional[str] = None
    aiModel: Optional[str] = None


# ---------------------------------------------------------------------------
# Citizen data
# ---------------------------------------------------------------------------

class CitizenData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    citizenToken: str
    applications: list[AuditRecord]


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

class PseudonymizeIn(BaseModel):
    citizenId: str


class PseudonymizeOut(BaseModel):
    token: str


class ValidateResult(BaseModel):
    valid: bool
    errors: list[str]


# ---------------------------------------------------------------------------
# Route decide
# ---------------------------------------------------------------------------

class RouteDecideRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    severity: str
    multipleProblems: bool
    risk_level: str
    fairness_flags: list[str]
    confidence: float
    consentForAI: bool = True


class RouteDecideResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    route: Literal["auto", "review", "rejected"]
    reason: str


# ---------------------------------------------------------------------------
# Audit write
# ---------------------------------------------------------------------------

class AuditWriteRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    applicationId: Optional[str] = None
    citizenToken: str
    provisionType: str
    severity: str
    route: str
    riskLevel: str
    confidence: Optional[float] = None
    fairnessFlags: list[str] = Field(default_factory=list)
    finalDecisionStatus: str
    processingPurpose: str = "wmo_intake"
    problemSummary: Optional[str] = None
    aiRecommendation: Optional[str] = None
    aiReasoning: Optional[str] = None
    aiModel: Optional[str] = None
