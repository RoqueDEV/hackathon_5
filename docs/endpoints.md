# API-referentie — WMO Intake Backend

Alle endpoints draaien op `http://localhost:8000` als de stack lokaal is gestart met `docker compose up --build`.

Interactieve documentatie is beschikbaar via:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 1. Systeem

### GET /health

**Doel:** Controleert of de backend actief is en een databaseverbinding heeft. Bedoeld voor container health checks en monitoringtools.

**Wie roept het aan:** Docker Compose health check, operations-monitoring.

**Response**

Schema: vrije JSON, geen Pydantic-model.

```json
{ "status": "ok" }
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Backend actief en database bereikbaar. |
| 500  | Database niet bereikbaar (onbehandelde uitzondering). |

**Voorbeeld curl**

```bash
curl http://localhost:8000/health
```

---

## 2. Aanvragen (orkestratie)

Deze endpoints vormen de bouwblokken van de n8n-workflow. n8n roept ze in volgorde aan. Ze kunnen ook rechtstreeks worden aangeroepen voor testen of voor een fallback zonder n8n.

### POST /applications/validate

**Doel:** Valideert de verplichte velden van een aanvraag en controleert of toestemming voor AI-gebruik is gegeven (`consentForAI=true`). Doet geen database-schrijfactie en roept geen AI aan.

**Wie roept het aan:** n8n (node "Valideer aanvraag"), frontend voor snelle pre-validatie.

**Request body** — schema `ApplicationIn`

| Veld | Type | Verplicht | Omschrijving |
|------|------|-----------|--------------|
| `citizenId` | string | ja | Intern burgeridentificatienummer (BSN-vervanging). |
| `name` | string | ja | Naam van de aanvrager (wordt niet opgeslagen na pseudonimisering). |
| `address` | string | ja | Adres van de aanvrager. |
| `dateOfBirth` | date (YYYY-MM-DD) | ja | Geboortedatum; wordt omgezet naar leeftijdsgroep. |
| `consentForAI` | boolean | ja | Toestemming voor verwerking met AI-ondersteuning. |
| `provisionType` | `"huishoudelijke_hulp"` \| `"rolstoel"` \| `"woningaanpassing"` | ja | Type WMO-voorziening. |
| `problemSummary` | string | ja | Vrije omschrijving van de hulpbehoefte. |
| `severity` | `"laag"` \| `"midden"` \| `"hoog"` | ja | Ernst van de situatie. |
| `householdContext` | object | nee | Extra huishoudgegevens (vrij formaat). |
| `mobilityIssues` | boolean | nee | Zijn er mobiliteitsproblemen? Standaard: `false`. |
| `multipleProblems` | boolean | nee | Meervoudige problematiek? Standaard: `false`. |
| `submittedAt` | datetime | nee | Tijdstip van indiening; standaard: huidig moment (UTC). |

```json
{
  "citizenId": "NL-12345678",
  "name": "Jan de Vries",
  "address": "Dorpsstraat 1, 1234 AB Voorbeeldstad",
  "dateOfBirth": "1955-03-22",
  "consentForAI": true,
  "provisionType": "huishoudelijke_hulp",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "severity": "midden",
  "mobilityIssues": false,
  "multipleProblems": false
}
```

**Response** — schema `ValidateResult`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `valid` | boolean | `true` als alle velden kloppen en toestemming is gegeven. |
| `errors` | list[string] | Lijst met foutmeldingen; leeg bij succes. |

```json
{ "valid": true, "errors": [] }
```

Voorbeeld bij validatiefout:

```json
{
  "valid": false,
  "errors": [
    "citizenId is verplicht",
    "consentForAI moet true zijn voor verwerking"
  ]
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd, ook bij validatiefouten. De `valid`-vlag geeft het resultaat aan. |
| 422  | Pydantic-parserfout (verkeerd JSON-formaat of ongeldig enum-waarde). |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/applications/validate \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-12345678",
    "name": "Jan de Vries",
    "address": "Dorpsstraat 1",
    "dateOfBirth": "1955-03-22",
    "consentForAI": true,
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Moeite met schoonmaken.",
    "severity": "midden"
  }'
```

---

### POST /pseudonymize

**Doel:** Zet een burger-ID om naar een deterministisch pseudoniem (HMAC-SHA256-token). Het originele ID verlaat dit endpoint nooit; alleen het token wordt doorgegeven aan downstream services en audit logs.

**Wie roept het aan:** n8n (node "Maak burger-token").

**Request body** — schema `PseudonymizeIn`

| Veld | Type | Verplicht | Omschrijving |
|------|------|-----------|--------------|
| `citizenId` | string | ja | Het originele burger-ID. |

```json
{ "citizenId": "NL-12345678" }
```

**Response** — schema `PseudonymizeOut`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `token` | string | Hexadecimale HMAC-hash; stabiel voor hetzelfde `citizenId`. |

```json
{ "token": "a3f8c2...d94e" }
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd bij een geldig request. |
| 422  | `citizenId` ontbreekt of is geen string. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/pseudonymize \
  -H "Content-Type: application/json" \
  -d '{ "citizenId": "NL-12345678" }'
```

---

### POST /minimize

**Doel:** Verwijdert alle persoonlijk identificeerbare informatie (PII) uit een aanvraag voordat de gegevens richting de AI-service gaan. Naam, adres en exacte geboortedatum worden weggegooid; de geboortedatum wordt omgezet naar een leeftijdsgroep.

**Wie roept het aan:** n8n (node "Verwijder PII").

**Request body** — schema `ApplicationIn` (zie POST /applications/validate voor veldtabel).

```json
{
  "citizenId": "NL-12345678",
  "name": "Jan de Vries",
  "address": "Dorpsstraat 1",
  "dateOfBirth": "1955-03-22",
  "consentForAI": true,
  "provisionType": "huishoudelijke_hulp",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "severity": "midden",
  "mobilityIssues": false,
  "multipleProblems": false
}
```

**Response** — schema `MinimizedApplication`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `citizenToken` | string | Pseudoniem van de burger (HMAC-token). |
| `ageGroup` | `"<18"` \| `"18-25"` \| `"26-40"` \| `"41-65"` \| `"65+"` | Leeftijdscategorie afgeleid van geboortedatum. |
| `provisionType` | string | Type voorziening. |
| `problemSummary` | string | Vrije omschrijving (zonder PII). |
| `severity` | string | Ernst. |
| `mobilityIssues` | boolean | Mobiliteitsproblemen. |
| `multipleProblems` | boolean | Meervoudige problematiek. |
| `householdSize` | integer \| null | Omvang huishouden, indien aanwezig. |

```json
{
  "citizenToken": "a3f8c2...d94e",
  "ageGroup": "65+",
  "provisionType": "huishoudelijke_hulp",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "severity": "midden",
  "mobilityIssues": false,
  "multipleProblems": false,
  "householdSize": null
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Succesvol geminimaliseerd. |
| 422  | Verplicht veld ontbreekt of heeft een ongeldig type. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/minimize \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-12345678",
    "name": "Jan de Vries",
    "address": "Dorpsstraat 1",
    "dateOfBirth": "1955-03-22",
    "consentForAI": true,
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Moeite met schoonmaken door artrose.",
    "severity": "midden",
    "mobilityIssues": false,
    "multipleProblems": false
  }'
```

---

### GET /policy/{provisionType}

**Doel:** Geeft de geldende WMO-beleidsregels terug voor het gevraagde voorzieningstype. De beleidsservice is een statische mock; uitbreiding naar een dynamische configuratie is mogelijk zonder API-wijziging.

**Wie roept het aan:** n8n (node "Haal WMO-beleid op"), frontend (informatieve weergave).

**Padparameter**

| Parameter | Toegestane waarden |
|-----------|--------------------|
| `provisionType` | `huishoudelijke_hulp`, `rolstoel`, `woningaanpassing` |

**Response** — schema `PolicyRule`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `provisionType` | string | Voorzieningstype. |
| `maxHoursPerWeek` | integer \| null | Maximum uren per week (alleen voor huishoudelijke hulp). |
| `eligibilityCriteria` | list[string] | Toelatingsvoorwaarden. |
| `requiredDocuments` | list[string] | Benodigde documenten. |
| `processingTimeDays` | integer | Wettelijke behandeltermijn in dagen. |
| `reviewRequired` | boolean | Of menselijke review altijd verplicht is. |

```json
{
  "provisionType": "huishoudelijke_hulp",
  "maxHoursPerWeek": 8,
  "eligibilityCriteria": [
    "Aantoonbare beperking in het voeren van een huishouden",
    "Geen compensatie via eigen netwerk of andere zorgvorm mogelijk",
    "Woonachtig in de gemeente"
  ],
  "requiredDocuments": [
    "Identiteitsbewijs",
    "Medische verklaring huisarts of specialist",
    "Inkomensverklaring (indien van toepassing)"
  ],
  "processingTimeDays": 28,
  "reviewRequired": false
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Beleid gevonden. |
| 404  | Onbekend voorzieningstype. |

**Voorbeeld curl**

```bash
curl http://localhost:8000/policy/huishoudelijke_hulp
```

---

### POST /ai/recommend

**Doel:** Genereert een AI-aanbeveling op basis van de geminimaliseerde aanvraag (geen PII). De service werkt in stub-modus: de uitvoer is deterministisch en voorspelbaar voor testdoeleinden. Elke aanroep wordt gelogd conform de EU AI Act (hoog-risicosysteem).

**Wie roept het aan:** n8n (node "Vraag AI-advies").

**Stub-gedrag**

- `problemSummary` bevat een demografische trigger (`godsdienst`, `religie`, `ras`, `nationaliteit`, `geslacht`) → `risk_level=high`, `confidence=0.5`, `reasoning` bevat de trigger zodat de fairness-check aanslaat.
- `severity=hoog` EN `multipleProblems=true` → `risk_level=high`, `confidence=0.6`.
- Anders → `risk_level=low`, `confidence=0.9`, voorzieningsspecifiek advies.

**Request body** — schema `MinimizedApplication` (zie POST /minimize voor veldtabel).

```json
{
  "citizenToken": "a3f8c2...d94e",
  "ageGroup": "65+",
  "provisionType": "huishoudelijke_hulp",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "severity": "midden",
  "mobilityIssues": false,
  "multipleProblems": false
}
```

**Response** — schema `AIRecommendation`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `recommendation` | string | Tekstueel advies voor de beoordelaar. |
| `reasoning` | string | Onderbouwing van het advies. |
| `confidence` | float (0.0–1.0) | Betrouwbaarheidsscore. |
| `risk_level` | `"low"` \| `"medium"` \| `"high"` | Risiconiveau van de aanvraag. |
| `model` | string | Modelidentificatie; altijd `"stub-v1"` in stub-modus. |

```json
{
  "recommendation": "Op basis van de ingediende gegevens lijkt huishoudelijke hulp passend. Adviseer toewijzing van maximaal 4 uur per week, afhankelijk van verdere beoordeling.",
  "reasoning": "De aanvraag voldoet aan de basisvoorwaarden op basis van de beschikbare gegevens. Geen bijzondere risicofactoren gedetecteerd.",
  "confidence": 0.9,
  "risk_level": "low",
  "model": "stub-v1"
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd bij een geldig request. |
| 422  | Verplicht veld ontbreekt of heeft een ongeldig type. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/ai/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "citizenToken": "a3f8c2d94e",
    "ageGroup": "65+",
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Moeite met schoonmaken door artrose.",
    "severity": "midden",
    "mobilityIssues": false,
    "multipleProblems": false
  }'
```

---

### POST /fairness/check

**Doel:** Controleert de AI-uitvoer op verboden termen die kunnen wijzen op discriminatie op grond van godsdienst, ras, nationaliteit, geslacht of seksuele geaardheid. Geeft een lijst van gevonden vlaggen terug. De blocklist is configureerbaar via een YAML-bestand.

**Wie roept het aan:** n8n (node "Controleer fairness").

**Request body** — schema `AIRecommendation` (zie POST /ai/recommend voor veldtabel).

```json
{
  "recommendation": "Nader onderzoek vereist.",
  "reasoning": "De probleemomschrijving bevat een verwijzing naar 'ras', wat niet relevant is voor de WMO-beoordeling.",
  "confidence": 0.5,
  "risk_level": "high",
  "model": "stub-v1"
}
```

**Response** — schema `FairnessResult`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `passed` | boolean | `true` als er geen verboden termen zijn gevonden. |
| `flags` | list[string] | Gevonden verboden termen. |
| `severity` | `"low"` \| `"medium"` \| `"high"` | Ernst van de fairness-bevinding. |

```json
{
  "passed": false,
  "flags": ["ras"],
  "severity": "high"
}
```

Voorbeeld bij geen vlaggen:

```json
{
  "passed": true,
  "flags": [],
  "severity": "low"
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd bij een geldig request. |
| 422  | Verplicht veld ontbreekt. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/fairness/check \
  -H "Content-Type: application/json" \
  -d '{
    "recommendation": "Nader onderzoek vereist.",
    "reasoning": "Bevat verwijzing naar ras.",
    "confidence": 0.5,
    "risk_level": "high",
    "model": "stub-v1"
  }'
```

---

### POST /route/decide

**Doel:** Bepaalt op basis van gecombineerde signalen welke verwerkingsroute een aanvraag volgt: automatisch verwerken (`auto`), doorsturen naar een menselijke beoordelaar (`review`), of afwijzen (`rejected`). De drempelwaarde voor betrouwbaarheid is instelbaar via de omgevingsvariabele `CONFIDENCE_THRESHOLD` (standaard: 0.7).

**Wie roept het aan:** n8n (node "Bepaal route").

**Routeringslogica**

Een aanvraag gaat naar `review` als aan een of meer van de volgende voorwaarden is voldaan:
- `severity == "hoog"`
- `multipleProblems == true`
- `risk_level == "high"`
- Er zijn fairness-vlaggen aanwezig
- `confidence` is lager dan de drempelwaarde (standaard 0.7)

**Request body** — schema `RouteDecideRequest`

| Veld | Type | Verplicht | Omschrijving |
|------|------|-----------|--------------|
| `severity` | string | ja | Ernst van de aanvraag. |
| `multipleProblems` | boolean | ja | Meervoudige problematiek. |
| `risk_level` | string | ja | Risiconiveau uit AI-aanbeveling. |
| `fairness_flags` | list[string] | ja | Gevonden fairness-vlaggen (mag leeg zijn). |
| `confidence` | float | ja | Betrouwbaarheidsscore van de AI (0.0–1.0). |
| `consentForAI` | boolean | nee | Toestemming voor AI; standaard `true`. |

```json
{
  "severity": "hoog",
  "multipleProblems": true,
  "risk_level": "high",
  "fairness_flags": [],
  "confidence": 0.6,
  "consentForAI": true
}
```

**Response** — schema `RouteDecideResponse`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `route` | `"auto"` \| `"review"` \| `"rejected"` | Gekozen verwerkingsroute. |
| `reason` | string | Leesbare toelichting op de keuze. |

```json
{
  "route": "review",
  "reason": "severity=hoog; meervoudige problematiek; AI risico=hoog; lage betrouwbaarheid (60%)"
}
```

Voorbeeld bij automatische verwerking:

```json
{
  "route": "auto",
  "reason": "Geen bijzondere risicofactoren"
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd bij een geldig request. |
| 422  | Verplicht veld ontbreekt. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/route/decide \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "midden",
    "multipleProblems": false,
    "risk_level": "low",
    "fairness_flags": [],
    "confidence": 0.9,
    "consentForAI": true
  }'
```

---

### POST /audit/write

**Doel:** Slaat een auditrecord op in de database en plaatst de aanvraag in de reviewwachtrij als de route `review` is. Dit is de schrijfstap aan het einde van de n8n-workflow. De bewaartermijn wordt automatisch ingesteld op 90 dagen (instelbaar via `RETENTION_DAYS`).

**Wie roept het aan:** n8n (node "Schrijf audit-log").

**Request body** — schema `AuditWriteRequest`

| Veld | Type | Verplicht | Omschrijving |
|------|------|-----------|--------------|
| `applicationId` | string (UUID) \| null | nee | Wordt gegenereerd als niet opgegeven. |
| `citizenToken` | string | ja | Pseudoniem van de burger. |
| `provisionType` | string | ja | Type voorziening. |
| `severity` | string | ja | Ernst. |
| `route` | string | ja | Gekozen route (`auto`, `review`, `rejected`). |
| `riskLevel` | string | ja | Risiconiveau. |
| `confidence` | float \| null | nee | Betrouwbaarheidsscore AI. |
| `fairnessFlags` | list[string] | nee | Gevonden fairness-vlaggen. Standaard: `[]`. |
| `finalDecisionStatus` | string | ja | Status van de beslissing (bv. `auto_approved`, `pending_review`). |
| `processingPurpose` | string | nee | Verwerkingsdoel; standaard `"wmo_intake"`. |
| `problemSummary` | string \| null | nee | Geminimaliseerde probleemomschrijving. |
| `aiRecommendation` | string \| null | nee | AI-aanbeveling als tekst. |
| `aiReasoning` | string \| null | nee | Onderbouwing AI. |
| `aiModel` | string \| null | nee | Modelidentificatie. |

```json
{
  "citizenToken": "a3f8c2...d94e",
  "provisionType": "huishoudelijke_hulp",
  "severity": "midden",
  "route": "auto",
  "riskLevel": "low",
  "confidence": 0.9,
  "fairnessFlags": [],
  "finalDecisionStatus": "auto_approved",
  "processingPurpose": "wmo_intake",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "aiRecommendation": "Adviseer toewijzing van maximaal 4 uur per week.",
  "aiReasoning": "De aanvraag voldoet aan de basisvoorwaarden.",
  "aiModel": "stub-v1"
}
```

**Response** — schema `AuditRecord`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `id` | UUID | Uniek record-ID. |
| `applicationId` | UUID | Aanvraag-ID. |
| `citizenToken` | string | Pseudoniem. |
| `provisionType` | string | Voorzieningstype. |
| `severity` | string | Ernst. |
| `route` | string | Gekozen route. |
| `riskLevel` | string | Risiconiveau. |
| `confidence` | float \| null | Betrouwbaarheidsscore. |
| `fairnessFlags` | list[string] | Fairness-vlaggen. |
| `finalDecisionStatus` | string | Beslissingsstatus. |
| `processingPurpose` | string | Verwerkingsdoel. |
| `retentionUntil` | datetime (ISO 8601) | Datum tot wanneer het record wordt bewaard. |
| `createdAt` | datetime (ISO 8601) | Tijdstip van aanmaken. |
| `problemSummary` | string \| null | Probleemomschrijving. |
| `aiRecommendation` | string \| null | AI-aanbeveling. |
| `aiReasoning` | string \| null | Onderbouwing AI. |
| `aiModel` | string \| null | Modelidentificatie. |

```json
{
  "id": "b1c2d3e4-...",
  "applicationId": "a1b2c3d4-...",
  "citizenToken": "a3f8c2...d94e",
  "provisionType": "huishoudelijke_hulp",
  "severity": "midden",
  "route": "auto",
  "riskLevel": "low",
  "confidence": 0.9,
  "fairnessFlags": [],
  "finalDecisionStatus": "auto_approved",
  "processingPurpose": "wmo_intake",
  "retentionUntil": "2026-07-16T00:00:00Z",
  "createdAt": "2026-04-16T10:00:00Z",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "aiRecommendation": "Adviseer toewijzing van maximaal 4 uur per week.",
  "aiReasoning": "De aanvraag voldoet aan de basisvoorwaarden.",
  "aiModel": "stub-v1"
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Auditrecord aangemaakt. |
| 422  | Verplicht veld ontbreekt. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/audit/write \
  -H "Content-Type: application/json" \
  -d '{
    "citizenToken": "a3f8c2d94e",
    "provisionType": "huishoudelijke_hulp",
    "severity": "midden",
    "route": "auto",
    "riskLevel": "low",
    "confidence": 0.9,
    "fairnessFlags": [],
    "finalDecisionStatus": "auto_approved",
    "processingPurpose": "wmo_intake"
  }'
```

---

### POST /applications — Deprecated

> **Let op:** Dit endpoint is verouderd. De n8n-workflow voert orkestratie nu stap voor stap uit via de losse endpoints hierboven. Dit endpoint blijft beschikbaar als fallback en voor lokaal testen zonder n8n.

**Doel:** Voert de volledige WMO-intake in één aanroep uit: validatie, pseudonimisering, data-minimalisatie, AI-aanbeveling, fairness-check, routebepaling, audit-logging en het samenstellen van een burgerbericht.

**Wie roept het aan:** Frontend (fallback), integratietests.

**Request body** — schema `ApplicationIn` (zie POST /applications/validate voor veldtabel).

```json
{
  "citizenId": "NL-12345678",
  "name": "Jan de Vries",
  "address": "Dorpsstraat 1",
  "dateOfBirth": "1955-03-22",
  "consentForAI": true,
  "provisionType": "huishoudelijke_hulp",
  "problemSummary": "Moeite met schoonmaken door artrose.",
  "severity": "midden",
  "mobilityIssues": false,
  "multipleProblems": false
}
```

**Response** — schema `ApplicationResult`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `applicationId` | UUID | Uniek aanvraag-ID. |
| `citizenToken` | string | Pseudoniem van de burger. |
| `route` | `"auto"` \| `"review"` \| `"rejected"` | Gekozen route. |
| `citizenMessage` | string | Transparant burgerbericht op taalniveau B1. |
| `aiRecommendation` | AIRecommendation \| null | AI-aanbeveling (zie schema hierboven). |
| `fairnessFlags` | list[string] | Gevonden fairness-vlaggen. |
| `riskLevel` | `"low"` \| `"medium"` \| `"high"` | Risiconiveau. |

```json
{
  "applicationId": "a1b2c3d4-...",
  "citizenToken": "a3f8c2...d94e",
  "route": "auto",
  "citizenMessage": "Uw WMO-aanvraag voor 'huishoudelijke_hulp' is ontvangen en automatisch beoordeeld. Bij de beoordeling is AI-ondersteuning gebruikt om uw aanvraag voor te bereiden. U ontvangt binnen de wettelijke termijn een officieel besluit.",
  "aiRecommendation": {
    "recommendation": "Adviseer toewijzing van maximaal 4 uur per week.",
    "reasoning": "De aanvraag voldoet aan de basisvoorwaarden.",
    "confidence": 0.9,
    "risk_level": "low",
    "model": "stub-v1"
  },
  "fairnessFlags": [],
  "riskLevel": "low"
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Aanvraag verwerkt. |
| 400  | `consentForAI=false`; aanvraag afgewezen, auditrecord aangemaakt. |
| 422  | Verplicht veld ontbreekt of ongeldig formaat. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/applications \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-12345678",
    "name": "Jan de Vries",
    "address": "Dorpsstraat 1",
    "dateOfBirth": "1955-03-22",
    "consentForAI": true,
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Moeite met schoonmaken door artrose.",
    "severity": "midden",
    "mobilityIssues": false,
    "multipleProblems": false
  }'
```

---

## 3. Beoordelingswachtrij (review)

### GET /review/queue

**Doel:** Geeft een lijst van aanvragen die wachten op beoordeling door een medewerker. De lijst is standaard gesorteerd op aanmaakdatum (oudste eerst). Optioneel te filteren op status.

**Wie roept het aan:** Frontend (Reviewer Dashboard).

**Queryparameter**

| Parameter | Type | Verplicht | Omschrijving |
|-----------|------|-----------|--------------|
| `status` | string | nee | Filter op status: `pending`, `approved`, `rejected`, `more_info`. Zonder filter: alle statussen. |

**Response** — list van schema `ReviewItem`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `id` | UUID | Uniek record-ID in de reviewwachtrij. |
| `applicationId` | UUID | Aanvraag-ID. |
| `citizenToken` | string | Pseudoniem van de burger. |
| `provisionType` | string | Voorzieningstype. |
| `severity` | string | Ernst. |
| `riskLevel` | string | Risiconiveau. |
| `fairnessFlags` | list[string] | Gevonden fairness-vlaggen. |
| `status` | `"pending"` \| `"approved"` \| `"rejected"` \| `"more_info"` | Huidige status. |
| `assignedTo` | string \| null | Toegewezen medewerker. |
| `createdAt` | datetime | Tijdstip van aanmaken. |
| `decision` | string \| null | Genomen beslissing. |
| `note` | string \| null | Toelichting van de beoordelaar. |
| `decidedAt` | datetime \| null | Tijdstip van beslissing. |
| `problemSummary` | string \| null | Geminimaliseerde probleemomschrijving. |
| `aiRecommendation` | string \| null | AI-aanbeveling als tekst. |
| `aiReasoning` | string \| null | Onderbouwing AI. |
| `confidence` | float \| null | Betrouwbaarheidsscore. |
| `aiModel` | string \| null | Modelidentificatie. |

```json
[
  {
    "id": "c1d2e3f4-...",
    "applicationId": "a1b2c3d4-...",
    "citizenToken": "a3f8c2...d94e",
    "provisionType": "rolstoel",
    "severity": "hoog",
    "riskLevel": "high",
    "fairnessFlags": [],
    "status": "pending",
    "assignedTo": null,
    "createdAt": "2026-04-16T10:00:00Z",
    "decision": null,
    "note": null,
    "decidedAt": null,
    "problemSummary": "Ernstige loopbeperking na herseninfarct.",
    "aiRecommendation": "Integrale toetsing door zorgadviseur aanbevolen.",
    "aiReasoning": "Hoge ernst in combinatie met meervoudige problematiek.",
    "confidence": 0.6,
    "aiModel": "stub-v1"
  }
]
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd, ook als de lijst leeg is. |

**Voorbeeld curl**

```bash
# Alle openstaande aanvragen
curl "http://localhost:8000/review/queue?status=pending"

# Alle aanvragen in de wachtrij
curl http://localhost:8000/review/queue
```

---

### POST /review/{applicationId}/decision

**Doel:** Registreert de beslissing van een medewerker op een aanvraag in de reviewwachtrij. Werkt de status bij en legt de beslissing vast in de audittrail.

**Wie roept het aan:** Frontend (Reviewer Dashboard).

**Padparameter**

| Parameter | Type | Omschrijving |
|-----------|------|--------------|
| `applicationId` | string (UUID) | ID van de aanvraag. |

**Request body** — schema `ReviewDecisionIn`

| Veld | Type | Verplicht | Omschrijving |
|------|------|-----------|--------------|
| `decision` | `"approved"` \| `"rejected"` \| `"more_info"` | ja | Genomen beslissing. |
| `note` | string \| null | nee | Optionele toelichting van de beoordelaar. |

```json
{
  "decision": "approved",
  "note": "Aanvraag goedgekeurd na overleg met huisarts."
}
```

**Response** — schema `ReviewItem` (zie GET /review/queue voor veldtabel).

```json
{
  "id": "c1d2e3f4-...",
  "applicationId": "a1b2c3d4-...",
  "citizenToken": "a3f8c2...d94e",
  "provisionType": "rolstoel",
  "severity": "hoog",
  "riskLevel": "high",
  "fairnessFlags": [],
  "status": "approved",
  "assignedTo": null,
  "createdAt": "2026-04-16T10:00:00Z",
  "decision": "approved",
  "note": "Aanvraag goedgekeurd na overleg met huisarts.",
  "decidedAt": "2026-04-16T14:30:00Z",
  "problemSummary": "Ernstige loopbeperking na herseninfarct.",
  "aiRecommendation": "Integrale toetsing door zorgadviseur aanbevolen.",
  "aiReasoning": "Hoge ernst in combinatie met meervoudige problematiek.",
  "confidence": 0.6,
  "aiModel": "stub-v1"
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Beslissing geregistreerd. |
| 404  | `applicationId` niet gevonden in de reviewwachtrij. |
| 422  | Ongeldige beslissingswaarde of verkeerd formaat. |

**Voorbeeld curl**

```bash
curl -X POST http://localhost:8000/review/a1b2c3d4-0000-0000-0000-000000000001/decision \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approved",
    "note": "Aanvraag goedgekeurd na overleg met huisarts."
  }'
```

---

## 4. Auditlog

### GET /audit

**Doel:** Geeft een gefilterde lijst van alle auditrecords. Bedoeld voor de Auditlog-pagina in het beheerdersportaal en voor compliance-controles. Elk record bevat alle informatie over de verwerking van een aanvraag, inclusief de AI-uitvoer.

**Wie roept het aan:** Frontend (Auditlog-pagina), compliance-medewerkers.

**Queryparameters**

| Parameter | Type | Verplicht | Omschrijving |
|-----------|------|-----------|--------------|
| `provision` | string | nee | Filter op voorzieningstype (bv. `huishoudelijke_hulp`). |
| `route` | string | nee | Filter op route (`auto`, `review`, `rejected`). |
| `risk` | string | nee | Filter op risiconiveau (`low`, `medium`, `high`). |
| `flag` | string | nee | Filter op aanwezigheid van een specifieke fairness-vlag. |

**Response** — list van schema `AuditRecord` (zie POST /audit/write voor veldtabel).

```json
[
  {
    "id": "b1c2d3e4-...",
    "applicationId": "a1b2c3d4-...",
    "citizenToken": "a3f8c2...d94e",
    "provisionType": "huishoudelijke_hulp",
    "severity": "midden",
    "route": "auto",
    "riskLevel": "low",
    "confidence": 0.9,
    "fairnessFlags": [],
    "finalDecisionStatus": "auto_approved",
    "processingPurpose": "wmo_intake",
    "retentionUntil": "2026-07-16T00:00:00Z",
    "createdAt": "2026-04-16T10:00:00Z",
    "problemSummary": "Moeite met schoonmaken door artrose.",
    "aiRecommendation": "Adviseer toewijzing van maximaal 4 uur per week.",
    "aiReasoning": "De aanvraag voldoet aan de basisvoorwaarden.",
    "aiModel": "stub-v1"
  }
]
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd, ook als de lijst leeg is. |

**Voorbeeld curl**

```bash
# Alle records
curl http://localhost:8000/audit

# Alleen hoog-risico aanvragen die handmatig zijn beoordeeld
curl "http://localhost:8000/audit?route=review&risk=high"

# Aanvragen met een specifieke fairness-vlag
curl "http://localhost:8000/audit?flag=ras"
```

---

### GET /audit/{id}

**Doel:** Geeft het volledige auditrecord voor een specifieke aanvraag. Bedoeld voor detailweergave in het beheerdersportaal en voor externe audits.

**Wie roept het aan:** Frontend (detailpaneel Auditlog-pagina), compliance-medewerkers.

**Padparameter**

| Parameter | Type | Omschrijving |
|-----------|------|--------------|
| `id` | string (UUID) | Aanvraag-ID (`applicationId`, niet het record-`id`). |

**Response** — schema `AuditRecord` (zie POST /audit/write voor veldtabel en JSON-voorbeeld).

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Record gevonden. |
| 404  | Geen auditrecord gevonden voor dit aanvraag-ID. |

**Voorbeeld curl**

```bash
curl http://localhost:8000/audit/a1b2c3d4-0000-0000-0000-000000000001
```

---

## 5. Burger inzage (AVG artikel 15)

### GET /citizen/{token}/data

**Doel:** Geeft alle verwerkte aanvragen terug die zijn gekoppeld aan een burger-token. Dit endpoint ondersteunt het recht op inzage zoals vastgelegd in artikel 15 van de AVG. Er wordt geen PII geretourneerd; alleen het pseudoniem en de geminimaliseerde verwerkingsgegevens.

**Wie roept het aan:** Frontend (burgerinzage, optioneel), gemeentelijke privacyfunctionaris.

**Padparameter**

| Parameter | Type | Omschrijving |
|-----------|------|--------------|
| `token` | string | Burger-token (HMAC-pseudoniem). |

**Response** — schema `CitizenData`

| Veld | Type | Omschrijving |
|------|------|--------------|
| `citizenToken` | string | Pseudoniem. |
| `applications` | list[AuditRecord] | Alle auditrecords gekoppeld aan dit token. |

```json
{
  "citizenToken": "a3f8c2...d94e",
  "applications": [
    {
      "id": "b1c2d3e4-...",
      "applicationId": "a1b2c3d4-...",
      "citizenToken": "a3f8c2...d94e",
      "provisionType": "huishoudelijke_hulp",
      "severity": "midden",
      "route": "auto",
      "riskLevel": "low",
      "confidence": 0.9,
      "fairnessFlags": [],
      "finalDecisionStatus": "auto_approved",
      "processingPurpose": "wmo_intake",
      "retentionUntil": "2026-07-16T00:00:00Z",
      "createdAt": "2026-04-16T10:00:00Z",
      "problemSummary": "Moeite met schoonmaken door artrose.",
      "aiRecommendation": "Adviseer toewijzing van maximaal 4 uur per week.",
      "aiReasoning": "De aanvraag voldoet aan de basisvoorwaarden.",
      "aiModel": "stub-v1"
    }
  ]
}
```

**Statuscodes**

| Code | Wanneer |
|------|---------|
| 200  | Altijd, ook als de burger geen aanvragen heeft (lege lijst). |

**Voorbeeld curl**

```bash
curl http://localhost:8000/citizen/a3f8c2d94e/data
```

---

## n8n flow-overzicht

De onderstaande tabel toont welk backend-endpoint door welke n8n-node wordt aangeroepen. De volledige workflow is beschikbaar als JSON in `n8n/workflows/wmo.json`.

| Stap | n8n-node | Endpoint |
|------|----------|----------|
| 1 | Ontvang aanvraag (Webhook) | Extern: `POST /webhook/wmo-intake` (n8n zelf) |
| 2 | Valideer aanvraag | `POST /applications/validate` |
| 3 | Maak burger-token | `POST /pseudonymize` |
| 4 | Verwijder PII | `POST /minimize` |
| 5 | Haal WMO-beleid op | `GET /policy/{provisionType}` |
| 6 | Vraag AI-advies | `POST /ai/recommend` |
| 7 | Controleer fairness | `POST /fairness/check` |
| 8 | Bepaal route | `POST /route/decide` |
| 9 | Schrijf audit-log | `POST /audit/write` |
| 10 | Stuur burgerbericht | Respons via n8n Respond to Webhook-node |

Bij validatiefouten (stap 2) stuurt n8n direct een foutmelding terug (HTTP 400) zonder de overige stappen uit te voeren.

---

## Verwijzing naar interactieve documentatie

De FastAPI-backend genereert automatisch een volledige OpenAPI-specificatie. Deze is beschikbaar als de stack lokaal draait:

- **Swagger UI** (interactief testen): http://localhost:8000/docs
- **ReDoc** (leesbare referentie): http://localhost:8000/redoc
- **OpenAPI JSON** (machine-leesbaar schema): http://localhost:8000/openapi.json
