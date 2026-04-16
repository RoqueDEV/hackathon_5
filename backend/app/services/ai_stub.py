"""Deterministic AI stub.

Scenarios (per plan.md + task spec):
1. problemSummary contains forbidden demographic terms
   → reasoning includes a forbidden term so fairness catches it.
2. severity == "hoog" AND multipleProblems == True
   → risk_level=high, confidence=0.6
3. otherwise
   → risk_level=low, confidence=0.9, provision-appropriate recommendation
"""

from app.models.schemas import AIRecommendation, MinimizedApplication

_DEMOGRAPHIC_TRIGGERS = {
    "godsdienst",
    "religie",
    "ras",
    "nationaliteit",
    "geslacht",
}

_PROVISION_RECOMMENDATIONS: dict[str, str] = {
    "huishoudelijke_hulp": (
        "Op basis van de ingediende gegevens lijkt huishoudelijke hulp passend. "
        "Adviseer toewijzing van maximaal 4 uur per week, afhankelijk van verdere beoordeling."
    ),
    "rolstoel": (
        "De aanvraag voldoet aan de basisvoorwaarden voor een rolstoel. "
        "Adviseer medische herbeoordeling door fysiotherapeut voor definitieve toewijzing."
    ),
    "woningaanpassing": (
        "Woningaanpassing lijkt noodzakelijk op basis van de beschreven mobiliteitsproblemen. "
        "Adviseer een woningschouwtoe door een ergotherapeut."
    ),
}


def _contains_trigger(text: str) -> str | None:
    """Return the first found trigger term, or None."""
    lower = text.lower()
    for term in _DEMOGRAPHIC_TRIGGERS:
        if term in lower:
            return term
    return None


def recommend(app: MinimizedApplication) -> AIRecommendation:
    trigger = _contains_trigger(app.problemSummary)

    if trigger:
        # Scenario 3: inject forbidden term into reasoning so fairness flags it
        return AIRecommendation(
            recommendation="Aanvraag vereist nader onderzoek vanwege gevoelige informatie in de omschrijving.",
            reasoning=(
                f"De probleemomschrijving bevat een verwijzing naar '{trigger}', "
                "wat niet relevant is voor de WMO-beoordeling. "
                "Het systeem markeert dit voor handmatige review."
            ),
            confidence=0.5,
            risk_level="high",
            model="stub-v1",
        )

    if app.severity == "hoog" and app.multipleProblems:
        # Scenario 2
        return AIRecommendation(
            recommendation=(
                "De combinatie van hoge ernst en meerdere problematiek vraagt om een uitgebreide beoordeling. "
                "Adviseer integrale toetsing door een zorgadviseur."
            ),
            reasoning=(
                "Hoge ernst in combinatie met meervoudige problematiek verhoogt het risico op onvolledige "
                "toewijzing. Menselijke review is vereist voor een zorgvuldige afweging."
            ),
            confidence=0.6,
            risk_level="high",
            model="stub-v1",
        )

    # Scenario 1: default low-risk
    recommendation = _PROVISION_RECOMMENDATIONS.get(
        app.provisionType,
        "Aanvraag lijkt in aanmerking te komen. Adviseer verdere standaard beoordeling.",
    )
    return AIRecommendation(
        recommendation=recommendation,
        reasoning=(
            "De aanvraag voldoet aan de basisvoorwaarden op basis van de beschikbare gegevens. "
            "Geen bijzondere risicofactoren gedetecteerd."
        ),
        confidence=0.9,
        risk_level="low",
        model="stub-v1",
    )
