"""Fairness checks: blocklist + reasoning quality checks."""

import os
from functools import lru_cache
from typing import Literal

import yaml

from app.core.config import settings
from app.models.schemas import AIRecommendation, FairnessResult

_OVERCONFIDENT_TERMS = {"zeker", "absoluut", "gegarandeerd"}
_HEDGING_TERMS = {"mogelijk", "lijkt", "adviseer", "afhankelijk", "kan", "zou", "wellicht", "misschien"}


@lru_cache(maxsize=1)
def _load_blocklist() -> dict[str, list[str]]:
    path = settings.FAIRNESS_BLOCKLIST_PATH
    # Fall back to local path when running tests
    if not os.path.exists(path):
        local = os.path.join(os.path.dirname(__file__), "..", "core", "fairness_blocklist.yaml")
        path = os.path.normpath(local)
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _detect_forbidden_terms(text: str) -> list[str]:
    blocklist = _load_blocklist()
    found: list[str] = []
    lower = text.lower()
    for category, terms in blocklist.items():
        for term in terms:
            if term in lower:
                found.append(f"forbidden_term:{term}")
    return found


def _check_reasoning(reasoning: str) -> list[str]:
    flags: list[str] = []
    if len(reasoning.strip()) < 20:
        flags.append("weak_reasoning")
        return flags  # no point checking further
    lower = reasoning.lower()
    has_overconfident = any(t in lower for t in _OVERCONFIDENT_TERMS)
    has_hedge = any(t in lower for t in _HEDGING_TERMS)
    if has_overconfident and not has_hedge:
        flags.append("overconfident_without_evidence")
    return flags


def _severity_from_flags(flags: list[str]) -> Literal["low", "medium", "high"]:
    if not flags:
        return "low"
    forbidden = [f for f in flags if f.startswith("forbidden_term:")]
    if forbidden:
        return "high"
    return "medium"


def check(recommendation: AIRecommendation) -> FairnessResult:
    flags: list[str] = []
    flags.extend(_detect_forbidden_terms(recommendation.reasoning))
    flags.extend(_detect_forbidden_terms(recommendation.recommendation))
    flags.extend(_check_reasoning(recommendation.reasoning))
    severity = _severity_from_flags(flags)
    return FairnessResult(
        passed=len(flags) == 0,
        flags=flags,
        severity=severity,
    )
