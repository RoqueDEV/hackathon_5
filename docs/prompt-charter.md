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
| `householdContext` | Geanonimiseerde huishoudensituatie (JSONB) |

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

De volgende categorieën zijn verboden in AI-invoer en -uitvoer. Detectie vindt plaats via de fairness-blocklist (`fairness_blocklist.yaml`).

| Categorie | Voorbeeldtermen (niet uitputtend) |
|---|---|
| **Religie / godsdienst** | godsdienst, religie, geloof, moslim, christen, islamitisch, kerkelijk |
| **Ras / etniciteit** | ras, etniciteit, afkomst, huidskleur, allochtoon |
| **Nationaliteit** | nationaliteit, buitenlands, niet-Nederlands, afkomstig uit |
| **Geslacht** | geslacht, man, vrouw, transgender (buiten medische context) |
| **Seksuele geaardheid** | seksuele voorkeur, homoseksueel, lesbisch, biseksueel |

**Koppeling:** De actuele en uitbreidbare lijst staat in `/app/app/core/fairness_blocklist.yaml`. Wanneer een verboden term wordt gedetecteerd in de `problemSummary` of AI-uitvoer, wordt:

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

## 9. Tools — Whitelist voor externe aanroepen

De AI-component mag uitsluitend de volgende interne endpoints aanroepen:

| Endpoint | Doel |
|---|---|
| `POST /applications/validate` | Validatie van invoer |
| `POST /pseudonymize` | Pseudonimisering burger-ID |
| `POST /minimize` | Data-minimalisatie vóór AI-aanroep |
| `GET /policy/{provisionType}` | Ophalen beleidsregels |
| `POST /ai/recommend` | AI-aanbeveling (interne stub) |
| `POST /fairness/check` | Fairness-controle op output |

**Niet toegestaan:**
- Aanroepen naar externe AI-services (OpenAI, Anthropic, Azure OpenAI) zonder expliciete configuratie en governance-goedkeuring
- Aanroepen naar externe databases of API's buiten bovenstaande whitelist
- Opslaan van aanvraagdata in externe systemen
- Verzenden van PII naar derden

Bij gebruik van een externe AI-service in productie moet de service zijn opgenomen in de verwerkersovereenkomst conform AVG artikel 28, en moet de EU AI Act compliance opnieuw worden beoordeeld.
