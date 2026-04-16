# Prompt Charter — WMO Zorgagent

**Versie:** 1.0  
**Datum:** April 2026  
**Beheerder:** Gemeente (intern AI-governance team)  
**Status:** Vastgesteld voor lokale ontwikkelomgeving

---

## 1. Scope en doel

Dit charter beschrijft de regels en begrenzingen voor de AI-component binnen het WMO Zorgagent prototype. De AI-component ondersteunt gemeentemedewerkers bij het beoordelen van WMO-aanvragen (Wet maatschappelijke ondersteuning). Het systeem verwerkt aanvragen voor:

- **Huishoudelijke hulp** — ondersteuning bij het voeren van een huishouden
- **Rolstoel** — hulpmiddelen voor mobiliteitsbeperking
- **Woningaanpassing** — structurele aanpassingen aan de woning

Het prototype draait lokaal zonder externe API-verbindingen. De AI-stub simuleert een AI-service op basis van deterministisch gedrag, zodat het systeem voorspelbaar en testbaar is zonder externe afhankelijkheden.

---

## 2. Rol van de AI (ondersteunend, niet beslissend)

De AI neemt **geen** definitieve besluiten. De AI is uitsluitend een beslissingsondersteunend hulpmiddel dat:

- Een aanbeveling formuleert op basis van geminimaliseerde, niet-identificerende invoer
- Een betrouwbaarheidsscore (`confidence`) meegeeft
- Een risiconiveau (`risk_level`) aangeeft
- Een onderbouwing (`reasoning`) levert die een menselijke beoordelaar kan controleren

Bij iedere aanvraag met hoog risico, meervoudige problematiek, fairness-vlaggen of lage betrouwbaarheidsscore **moet** een medewerker de aanbeveling beoordelen voordat een besluit wordt genomen. De AI vervangt het professionele oordeel van de gemeentemedewerker niet.

---

## 3. Toon en stijl

De AI communiceert in **helder, begrijpelijk Nederlands** op **B1-taalniveau**:

- Zinnen zijn kort en concreet (maximaal 20–25 woorden per zin)
- Geen jargon, afkortingen of technisch vakjargon richting de burger
- Respectvol en neutraal — geen oordeel over de persoon, alleen over de situatie
- Zakelijk en professioneel richting medewerkers (intern)
- Gebruik actieve zinsconstructies
- Geen termen die schuldgevoel, angst of urgentie onnodig versterken

**Voorbeeld burgerbericht (correct):**  
"Uw aanvraag is ontvangen. Een medewerker bekijkt uw aanvraag zorgvuldig. U hoort binnen 5 werkdagen meer."

**Voorbeeld burgerbericht (incorrect):**  
"Uw aanvraag is complex en heeft een hoog risiconiveau. De AI geeft een lage betrouwbaarheidsscore van 0.6."

---

## 4. Wat de AI niet mag

De AI-component mag in geen geval:

- **Medisch advies** geven of medische diagnoses stellen
- **Juridisch advies** geven of een juridisch oordeel vellen over rechten of verplichtingen
- **Financieel advies** geven, ook niet over toeslagen of bijdragen
- **PII (persoonsgegevens)** opnemen in de output: geen naam, adres, geboortedatum of BSN
- **Definitieve besluiten** communiceren — altijd een menselijke beslisser vermelden
- **Stellige uitspraken** doen zonder onderbouwing (bijv. "U heeft geen recht op..." zonder toelichting)
- **Interne beleidsregels** of drempelwaarden letterlijk citeren in burgerberichten
- **Negatieve generalisaties** maken over bevolkingsgroepen, leefstijlen of omstandigheden
- Antwoord geven in een andere taal dan het Nederlands, tenzij de burger dit expliciet aanvraagt

---

## 5. Privacy (AVG)

Het systeem verwerkt persoonsgegevens conform de Algemene Verordening Gegevensbescherming (AVG / GDPR).

### Welke gegevens verwerkt de AI
De AI-component ontvangt uitsluitend **geminimaliseerde, niet-identificerende** gegevens:

| Veld | Beschrijving |
|---|---|
| `provisionType` | Type aangevraagde voorziening |
| `problemSummary` | Omschrijving van de situatie (geanonimiseerd) |
| `severity` | Ernst van de situatie (laag / midden / hoog) |
| `ageGroup` | Leeftijdscategorie (\<18, 18-25, 26-40, 41-65, 65+) |
| `mobilityIssues` | Aanwezigheid van mobiliteitsproblemen (boolean) |
| `multipleProblems` | Meervoudige problematiek (boolean) |
| `householdSize` | Aantal personen in het huishouden (integer, optioneel) |

### Welke gegevens de AI nooit ontvangt
- Naam
- Adres
- Exacte geboortedatum
- Burger-ID (BSN of equivalent)
- Contactgegevens

### Pseudonimisering
Het burger-ID wordt pseudonimiseerd via HMAC-SHA256 met een lokale geheime sleutel (`PSEUDONYM_SECRET`). Alleen het token (`cit_` + eerste 16 tekens van de hash) wordt opgeslagen in logs en doorgegeven aan downstream services.

### Bewaartermijn
Audit-records worden bewaard voor **90 dagen** (configureerbaar via `RETENTION_DAYS`). Het veld `retention_until` in de audit-log registreert de exacte vervaldatum. Na deze datum worden records verwijderd conform de doelbinding.

### Recht op inzage
Een burger kan via het endpoint `GET /citizen/{token}/data` alle opgeslagen data opvragen die aan zijn of haar token is gekoppeld. Dit ondersteunt het recht op inzage uit artikel 15 AVG.

### Doelbinding
Elke audit-record bevat het veld `processing_purpose` dat vastlegt waarvoor de gegevens zijn verwerkt. Verwerking buiten dit doel is niet toegestaan.

---

## 6. EU AI Act — Classificatie en verplichtingen

### Classificatie
Dit systeem is geclassificeerd als een **hoog-risico AI-systeem** in de zin van de EU AI Act (Bijlage III, punt 5: AI-systemen in de publieke sector voor de beoordeling van voordelen en diensten). Als zodanig gelden de verplichtingen uit Artikel 9–17 van de EU AI Act.

### Transparantieplicht
- Burgers worden geïnformeerd dat AI is gebruikt bij de voorbereiding van een beslissing
- Het burgerbericht vermeldt expliciet dat AI een ondersteunende rol heeft gespeeld
- De AI-aanbeveling, het model, de betrouwbaarheidsscore en het risiconiveau worden gelogd

### Verplicht menselijk toezicht
Bij de volgende condities is menselijk toezicht **verplicht** voordat een besluit wordt gecommuniceerd:

| Conditie | Drempel |
|---|---|
| Ernstigheid aanvraag | `severity == hoog` |
| Meervoudige problematiek | `multipleProblems == true` |
| AI risiconiveau | `risk_level == high` |
| Fairness-vlaggen | `fairness_flags.length > 0` |
| Lage betrouwbaarheid | `confidence < CONFIDENCE_THRESHOLD` (standaard 0.7) |

### Logging (EU AI Act artikel 12)
Elke AI-beslissing wordt gelogd met:
- `application_id` — unieke aanvraag-identifier
- `ai_model` — naam van het gebruikte model
- `ai_confidence` — betrouwbaarheidsscore (0.0–1.0)
- `risk_level` — risiconiveau van de aanbeveling
- `ai_recommendation` — de gegeven aanbeveling
- `reasoning` — motivering van de aanbeveling
- `fairness_flags` — gedetecteerde fairness-issues
- `final_route` — routering (auto / review / rejected)
- `created_at` — tijdstip van verwerking

---

## 7. Verboden inhoudscategorieën

De volgende categorieën zijn verboden in AI-invoer en -uitvoer. Detectie vindt plaats via de fairness-blocklist (`fairness_blocklist.yaml`). De onderstaande tabel is illustratief; de YAML is de gezaghebbende bron.

| Categorie | Voorbeeldtermen (illustratief, niet uitputtend) |
|---|---|
| **Religie / godsdienst** | religie, godsdienst, islamitisch, moslim, joods, hindoe, kerk, moskee |
| **Ras** | ras, huidskleur, blank, zwart |
| **Etniciteit** | etniciteit, etnisch, afkomst, herkomst |
| **Nationaliteit** | nationaliteit, buitenlander, allochtoon, autochtoon, migrant, vluchteling |
| **Geslacht** | geslacht, man, vrouw, transgender, non-binair |
| **Seksuele geaardheid** | seksuele geaardheid, homo, lesbisch, biseksueel, lgbtq |

**Koppeling:** De actuele en uitbreidbare lijst staat in `backend/app/core/fairness_blocklist.yaml`. Wanneer een verboden term wordt gedetecteerd in de `problemSummary` of AI-uitvoer, wordt:

1. Een fairness-vlag toegevoegd (`forbidden_term:<categorie>`)
2. De aanvraag automatisch doorgestuurd naar menselijke review
3. De vlag gelogd in de audit-tabel

Het feit dat een aanvraag een verboden term bevat, betekent **niet** dat de aanvraag wordt afgewezen. Het betekent dat een medewerker extra aandacht besteedt aan een neutrale beoordeling.

---

## 8. Logging en audit

### Doel
Alle beslissingen en tussenliggende stappen worden vastgelegd voor:
- Verantwoording richting burger en toezichthouder
- Interne kwaliteitscontrole en audittrail
- Naleving EU AI Act (artikel 12) en AVG

### Gelogde velden (tabel `audit_logs`)
| Veld | Type | Beschrijving |
|---|---|---|
| `application_id` | UUID | Unieke aanvraagidentifier |
| `citizen_token` | TEXT | Pseudoniem van de burger |
| `provision_type` | TEXT | Type voorziening |
| `severity` | TEXT | Ernst (laag/midden/hoog) |
| `risk_level` | TEXT | AI-risiconiveau (low/medium/high) |
| `fairness_flags` | JSONB | Lijst van gedetecteerde vlaggen |
| `ai_recommendation` | TEXT | AI-aanbeveling (tekst) |
| `reasoning` | TEXT | Motivering van de AI |
| `ai_model` | TEXT | Naam van het gebruikte model |
| `ai_confidence` | NUMERIC | Betrouwbaarheidsscore |
| `final_route` | TEXT | Eindroute (auto/review/rejected) |
| `final_decision_status` | TEXT | Status na besluitvorming |
| `processing_purpose` | TEXT | Doel van de gegevensverwerking |
| `retention_until` | TIMESTAMPTZ | Vervaldatum van het record |
| `created_at` | TIMESTAMPTZ | Aanmaakdatum van het record |

### Toegang
Audit-records zijn uitsluitend toegankelijk voor geautoriseerde gemeentemedewerkers via:
- `GET /audit` — overzicht met filters
- `GET /audit/{applicationId}` — detail van één aanvraag

---

## 9. Toolgebruik — de AI heeft geen externe tools

De AI-component (`backend/app/services/ai_stub.py`, model `stub-v1`) is een **gesloten, deterministische Python-functie** met de volgende signatuur:

```
recommend(app: MinimizedApplication) -> AIRecommendation
```

De AI-component:

- Doet **geen** netwerkaanroepen
- Heeft **geen** toegang tot het internet
- Voert **geen** code uit in een externe omgeving
- Genereert **geen** afbeeldingen
- Raadpleegt **geen** externe databases of API's

De orkestratie (validatie, pseudonimisering, data-minimalisatie, policy-opvraging, fairness-check en audit-logging) wordt uitgevoerd door de FastAPI-backend en de n8n-workflow, niet door de AI-component zelf.

**Niet-AI-endpoints die de orkestratie gebruikt (ter informatie):**

| Endpoint | Doel |
|---|---|
| `GET /policy/{provisionType}` | Ophalen beleidsregels |
| `POST /ai/recommend` | AI-aanbeveling aanvragen bij de stub |
| `POST /fairness/check` | Fairness-controle op AI-uitvoer |

**Bij overgang naar productie:**  
Wanneer in de toekomst een externe AI-service wordt ingezet (bijv. OpenAI, Anthropic, Azure OpenAI), gelden de volgende aanvullende vereisten:

- De service moet zijn opgenomen in de verwerkersovereenkomst conform AVG artikel 28.
- EU AI Act compliance moet opnieuw worden beoordeeld voor het specifieke model.
- Expliciete governance-goedkeuring is vereist voordat productieverkeer naar de externe service wordt gerouteerd.
- PII mag nooit worden meegestuurd; de data-minimalisatiestap (`MinimizedApplication`) blijft verplicht.

---

## 10. AI-model — huidige implementatie (stub-v1)

Het huidige systeem gebruikt **model `stub-v1`**: een volledig deterministisch algoritme zonder machine learning, externe API of taalmodel.

### Werking

De stub bepaalt zijn uitvoer op basis van drie scenario's, in volgorde van prioriteit:

1. **Demografische trigger in `problemSummary`** — de omschrijving bevat een verboden term (zie sectie 7). De stub retourneert `risk_level=high`, `confidence=0.5` en een reasoning die de term herhaalt zodat de fairness-check hem detecteert en de aanvraag doorstuurt naar review.
2. **Hoge ernst + meervoudige problematiek** — `severity == "hoog"` en `multipleProblems == true`. De stub retourneert `risk_level=high`, `confidence=0.6` en adviseert integrale toetsing.
3. **Standaard** — alle overige gevallen. De stub retourneert een voorziening-specifieke aanbeveling met `risk_level=low` en `confidence=0.9`.

### Vaste uitvoerstructuur

Elke aanroep retourneert exact de volgende velden:

| Veld | Type | Beschrijving |
|---|---|---|
| `recommendation` | TEXT | Tekstuele aanbeveling |
| `reasoning` | TEXT | Onderbouwing van de aanbeveling |
| `confidence` | NUMERIC (0.0–1.0) | Betrouwbaarheidsscore |
| `risk_level` | TEXT (low/medium/high) | Risiconiveau |
| `model` | TEXT | Altijd `"stub-v1"` in het huidige prototype |

### Transparantie conform EU AI Act artikel 13

Burgers ontvangen altijd een bericht dat vermeldt dat een AI-systeem een ondersteunende rol heeft gespeeld. Het precieze model, de betrouwbaarheidsscore en het risiconiveau worden gelogd in de audit-tabel (zie sectie 8), maar worden niet letterlijk gecommuniceerd in burgerberichten.

---

## 11. Veiligheidsrichtlijnen

### Medisch, juridisch en financieel advies

De AI-component geeft geen medisch, juridisch of financieel advies. Dit is structureel afgedwongen door het deterministische karakter van de stub: de uitvoer is vooraf vastgesteld en bevat geen generatieve tekst over diagnoses, rechten of financiële aanspraken.

Wanneer een burger of medewerker specifiek vraagt naar medische, juridische of financiële aspecten, geldt:

- De AI-component reageert niet op zulke vragen (de stub heeft geen invoerverwerking voor vrije tekst anders dan `problemSummary`).
- De burger wordt via het burgerbericht doorverwezen naar een medewerker.

Bij overgang naar een generatief model in productie moet de systeemprompt expliciet de volgende disclaimers bevatten:

- **Medisch:** "Dit systeem geeft geen medisch advies. Raadpleeg een arts of medisch specialist."
- **Juridisch:** "Dit systeem geeft geen juridisch advies. Raadpleeg een jurist of rechtshulpverlener."
- **Financieel:** "Dit systeem geeft geen financieel advies over toeslagen, eigen bijdragen of uitkeringen. Raadpleeg de gemeente of een financieel adviseur."

### Onverwachte invoer

Invoer die buiten de verwachte parameters valt (ontbrekende velden, onjuiste waarden) wordt afgevangen door de Pydantic-validatie in de FastAPI-backend voordat de AI-component wordt aangeroepen. De AI-component ontvangt altijd een valide `MinimizedApplication`.

---

## 12. Testcases en charter-koppeling

De vier verplichte testcases tonen aan dat het charter in de praktijk wordt afgedwongen. De onderstaande tabel koppelt elke testcase aan de charter-secties die de afhandeling regelen.

| Testcase | Invoer | Verwachte uitkomst | Charter-secties |
|---|---|---|---|
| **1. Laag risico** | Neutrale aanvraag, `severity=laag`, geen verboden termen, `consentForAI=true` | Route `auto`, burgerbericht vermeldt AI-gebruik, geen review nodig | Secties 2, 3, 6 (transparantieplicht), 10 (scenario 3) |
| **2. Hoog risico** | `severity=hoog`, `multipleProblems=true`, `consentForAI=true` | Route `review`, zichtbaar in reviewer dashboard, medewerker beslist | Secties 2, 6 (verplicht menselijk toezicht), 10 (scenario 2) |
| **3. Fairness-vlag** | `problemSummary` bevat een verboden demografische term | Fairness-vlag gedetecteerd, route `review`, vlag gelogd in audit | Secties 7, 8, 10 (scenario 1) |
| **4. Consent ontbreekt** | `consentForAI=false` | Validatiefout, geen AI-aanroep, audit-record met foutstatus, duidelijke foutmelding richting burger | Secties 4, 5 (doelbinding), 8 (audit van validatiefouten) |

### Toelichting per testcase

**Testcase 1 (laag risico):** De stub retourneert `confidence=0.9` en `risk_level=low`. Geen van de review-condities uit sectie 6 is actief. Het burgerbericht vermeldt expliciet dat AI is gebruikt (EU AI Act artikel 13).

**Testcase 2 (hoog risico):** De stub detecteert `severity=hoog` en `multipleProblems=true` (scenario 2) en retourneert `risk_level=high`, `confidence=0.6`. De router (sectie 6) stuurt de aanvraag naar `review`. De medewerker ziet de aanvraag in het reviewer dashboard.

**Testcase 3 (fairness-vlag):** De stub injecteert de gevonden verboden term in de `reasoning` (scenario 1). De fairness-check (`backend/app/services/fairness.py`) detecteert de term en voegt een `forbidden_term:<term>`-vlag toe. De router stuurt de aanvraag naar `review`. De vlag wordt gelogd.

**Testcase 4 (consent ontbreekt):** De FastAPI-backend controleert `consentForAI` als eerste stap. Bij `false` stopt de verwerking direct: er wordt geen `MinimizedApplication` aangemaakt, de AI-component wordt niet aangeroepen, en de audit-log registreert een foutstatus. De burger ontvangt een begrijpelijk foutbericht op B1-niveau.
