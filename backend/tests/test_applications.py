"""Four end-to-end test cases per plan.md."""

from datetime import date, datetime

import pytest


_BASE_PAYLOAD = {
    "citizenId": "123456789",
    "name": "Jan de Vries",
    "address": "Teststraat 1, Amsterdam",
    "dateOfBirth": "1970-05-15",
    "consentForAI": True,
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Ik kan mijn huis niet meer schoonhouden door knieproblemen.",
    "severity": "laag",
    "householdContext": {"size": 2},
    "mobilityIssues": False,
    "multipleProblems": False,
    "submittedAt": datetime.utcnow().isoformat(),
}


def _payload(**overrides) -> dict:
    return {**_BASE_PAYLOAD, **overrides}


class TestCase1_AutoRoute:
    """Testcase 1: laag risico → auto route, confidence=0.9, risk_level=low."""

    def test_auto_route(self, client):
        resp = client.post("/applications", json=_payload())
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["route"] == "auto"
        assert data["riskLevel"] == "low"
        ai = data["aiRecommendation"]
        assert ai is not None
        assert ai["confidence"] == 0.9
        assert ai["risk_level"] == "low"
        assert ai["model"] == "stub-v1"
        assert len(data["fairnessFlags"]) == 0
        assert data["citizenToken"].startswith("cit_")
        assert "AI-ondersteuning" in data["citizenMessage"]


class TestCase2_ReviewHighRisk:
    """Testcase 2: severity=hoog + multipleProblems=True → review, confidence=0.6, risk_level=high."""

    def test_review_route(self, client):
        resp = client.post(
            "/applications",
            json=_payload(
                severity="hoog",
                multipleProblems=True,
                problemSummary="Zware mobiliteitsproblemen en cognitieve achteruitgang.",
            ),
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["route"] == "review"
        assert data["riskLevel"] == "high"
        ai = data["aiRecommendation"]
        assert ai["confidence"] == 0.6
        assert ai["risk_level"] == "high"
        assert "medewerker" in data["citizenMessage"]

    def test_review_item_in_queue(self, client):
        resp = client.get("/review/queue?status=pending")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) >= 1
        assert all(i["status"] == "pending" for i in items)


class TestCase3_FairnessFlag:
    """Testcase 3: problemSummary bevat 'godsdienst' → fairness flag, route=review."""

    def test_fairness_flagged(self, client):
        resp = client.post(
            "/applications",
            json=_payload(
                problemSummary="Door mijn godsdienst heb ik extra beperkingen in mijn dagelijks leven.",
                severity="midden",
                multipleProblems=False,
            ),
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        # fairness flags must be non-empty
        assert len(data["fairnessFlags"]) > 0
        # a forbidden_term flag should be present
        forbidden = [f for f in data["fairnessFlags"] if "forbidden_term" in f]
        assert len(forbidden) > 0
        # route must be review (fairness flags trigger it)
        assert data["route"] == "review"

    def test_fairness_check_endpoint(self, client):
        """Direct fairness/check endpoint with AI output containing forbidden term."""
        ai_payload = {
            "recommendation": "Aanvraag goedgekeurd.",
            "reasoning": "Vanwege godsdienst heeft aanvrager beperkte mogelijkheden.",
            "confidence": 0.8,
            "risk_level": "low",
            "model": "stub-v1",
        }
        resp = client.post("/fairness/check", json=ai_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["passed"] is False
        assert any("forbidden_term" in f for f in data["flags"])


class TestCase4_NoConsent:
    """Testcase 4: consentForAI=false → HTTP 400, route=rejected, audit gelogd."""

    def test_no_consent_returns_400(self, client):
        resp = client.post("/applications", json=_payload(consentForAI=False))
        assert resp.status_code == 400, resp.text
        detail = resp.json()["detail"]
        assert detail["route"] == "rejected"
        assert detail["error"] == "consent_required"
        assert "consentForAI" in detail["message"] or "toestemming" in detail["message"]

    def test_no_consent_audit_logged(self, client):
        """After the no-consent request, audit log should contain a rejected_no_consent entry."""
        # Submit without consent to ensure at least one entry
        client.post("/applications", json=_payload(consentForAI=False, citizenId="no_consent_citizen"))
        resp = client.get("/audit?route=rejected")
        assert resp.status_code == 200
        records = resp.json()
        rejected = [r for r in records if r["finalDecisionStatus"] == "rejected_no_consent"]
        assert len(rejected) >= 1
