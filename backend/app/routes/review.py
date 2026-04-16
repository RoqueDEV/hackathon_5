from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.schemas import ReviewDecisionIn, ReviewItem
from app.services.audit import apply_review_decision, get_review_queue

router = APIRouter()


@router.get("/review/queue", response_model=list[ReviewItem])
def list_review_queue(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[ReviewItem]:
    return get_review_queue(db, status=status)


@router.post("/review/{application_id}/decision", response_model=ReviewItem)
def post_review_decision(
    application_id: str,
    body: ReviewDecisionIn,
    db: Session = Depends(get_db),
) -> ReviewItem:
    item = apply_review_decision(db, application_id, body.decision, body.note)
    if not item:
        raise HTTPException(status_code=404, detail="Aanvraag niet gevonden in de reviewwachtrij")
    return item
