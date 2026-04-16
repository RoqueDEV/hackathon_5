"""Unit tests for fairness service."""

import pytest

from app.models.schemas import AIRecommendation
from app.services.fairness import check


def _make_rec(**kwargs) -> AIRecommendation:
    defaults = {
        "recommendation": "Aanvraag goedgekeurd.",
        "reasoning": "De aanvraag voldoet aan de basisvoorwaarden.",
        "confidence": 0.9,
        "risk_level": "low",
        "model": "stub-v1",
    }
    defaults.update(kwargs)
    return AIRecommendation(**defaults)


def test_clean_passes():
    result = check(_make_rec())
    assert result.passed is True
    assert result.flags == []
    assert result.severity == "low"


def test_forbidden_term_detected():
    result = check(_make_rec(reasoning="Vanwege de godsdienst van aanvrager."))
    assert result.passed is False
    assert any("forbidden_term" in f for f in result.flags)
    assert result.severity == "high"


def test_weak_reasoning():
    result = check(_make_rec(reasoning="Ok."))
    assert result.passed is False
    assert "weak_reasoning" in result.flags


def test_overconfident_without_hedge():
    result = check(_make_rec(reasoning="Dit is absoluut de beste beslissing en er is geen twijfel hierover."))
    assert result.passed is False
    assert "overconfident_without_evidence" in result.flags


def test_overconfident_with_hedge_passes():
    result = check(_make_rec(reasoning="Dit lijkt absoluut de beste optie, afhankelijk van verdere beoordeling."))
    # Should pass because it has hedging words
    assert "overconfident_without_evidence" not in result.flags
