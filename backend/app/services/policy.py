from app.models.schemas import PolicyRule

_POLICIES: dict[str, PolicyRule] = {
    "huishoudelijke_hulp": PolicyRule(
        provisionType="huishoudelijke_hulp",
        maxHoursPerWeek=8,
        eligibilityCriteria=[
            "Aantoonbare beperking in het voeren van een huishouden",
            "Geen compensatie via eigen netwerk of andere zorgvorm mogelijk",
            "Woonachtig in de gemeente",
        ],
        requiredDocuments=[
            "Identiteitsbewijs",
            "Medische verklaring huisarts of specialist",
            "Inkomensverklaring (indien van toepassing)",
        ],
        processingTimeDays=28,
        reviewRequired=False,
    ),
    "rolstoel": PolicyRule(
        provisionType="rolstoel",
        maxHoursPerWeek=None,
        eligibilityCriteria=[
            "Medisch aantoonbare loopbeperking",
            "Rolstoel noodzakelijk voor zelfredzaamheid en participatie",
            "Woonachtig in de gemeente",
        ],
        requiredDocuments=[
            "Identiteitsbewijs",
            "Medisch advies fysiotherapeut of revalidatiearts",
            "Verklaring zorgverzekeraar (indien van toepassing)",
        ],
        processingTimeDays=42,
        reviewRequired=True,
    ),
    "woningaanpassing": PolicyRule(
        provisionType="woningaanpassing",
        maxHoursPerWeek=None,
        eligibilityCriteria=[
            "Aantoonbare lichamelijke beperking die zelfstandig wonen belemmert",
            "Aanpassing technisch uitvoerbaar in de woning",
            "Andere woningoplossing niet passend of beschikbaar",
        ],
        requiredDocuments=[
            "Identiteitsbewijs",
            "Medisch advies",
            "Bewijs van huur- of eigendomssituatie woning",
            "Offerte aannemer (indien beschikbaar)",
        ],
        processingTimeDays=56,
        reviewRequired=True,
    ),
}


def get_policy(provision_type: str) -> PolicyRule | None:
    return _POLICIES.get(provision_type)
