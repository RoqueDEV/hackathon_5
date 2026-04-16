# Database-schema en auditlog

## 1. Inleiding

Dit prototype slaat elke stap van een WMO-aanvraag op in een auditlog. Dat is om drie redenen verplicht.

**AVG artikel 5 en 30.** De Algemene verordening gegevensbescherming vereist dat een organisatie kan aantonen dat zij persoonsgegevens rechtmatig verwerkt. Artikel 30 verplicht een verwerkingsregister met onder andere het doel van de verwerking, de bewaartermijn en de categorieën van betrokkenen. Het auditlog vervult die rol.

**EU AI Act artikel 12 en 13.** De EU AI Act stelt logvereisten aan hoog-risico AI-systemen. Dit prototype is aangemerkt als hoog-risico AI-systeem (zie `docs/prompt-charter.md`). Artikel 12 vereist automatische logging van AI-uitkomsten, inclusief het gebruikte model, de betrouwbaarheidsscore en het risiconiveau. Artikel 13 vereist transparantie richting de betrokkene: de burger moet weten dat een AI-systeem betrokken was bij de beoordeling.

**Interne traceerbaarheid.** Menselijke beoordelaars (reviewers) moeten kunnen zien waarom een aanvraag naar hen is doorgestuurd, wat de AI heeft aanbevolen en welke fairness-vlaggen zijn gegenereerd. Zonder een volledig auditlog is dat niet mogelijk.

---

## 2. Database-overzicht

De database is Postgres 16 met de pgvector-extensie. De extensie wordt ingeladen door `db/init.sql`. De tabellen worden aangemaakt door de backend via `SQLAlchemy Base.metadata.create_all()` bij het opstarten, zodat `backend/app/models/db_models.py` de enige bron van waarheid is voor het schema.

| Tabel | Doel | Geinitialiseerd door |
|---|---|---|
| `applications` | Basisregistratie van ingediende aanvragen | SQLAlchemy ORM (backend) |
| `audit_logs` | Onveranderlijk logboek van elke verwerking | SQLAlchemy ORM (backend) |
| `review_queue` | Wachtrij voor aanvragen die menselijke beoordeling vereisen | SQLAlchemy ORM (backend) |
| `reviewer_decisions` | Vastlegging van beoordelaarsbeslissingen | SQLAlchemy ORM (backend) |
| `policy_embeddings` | Vectorstore voor toekomstige RAG op beleidsregels | `db/init.sql` |

---

## 3. Tabel `audit_logs`

Elke aanvraag levert precies een record op in deze tabel. Het record wordt aangemaakt na afronding van de volledige verwerkingspipeline (validatie, pseudonimisering, AI-beoordeling, fairness-check, routering). Als de verwerking mislukt — bijvoorbeeld omdat de burger geen toestemming heeft gegeven voor AI-gebruik — wordt alsnog een record aangemaakt met de foutstatus als `final_decision_status`.

| Kolom | Type | Nullable | Beschrijving |
|---|---|---|---|
| `id` | `VARCHAR` (UUID) | nee | Primaire sleutel. Willekeurig gegenereerd UUID. |
| `application_id` | `VARCHAR` (UUID) | nee | Verwijzing naar de aanvraag. Geindexeerd voor snelle opzoeking. |
| `citizen_token` | `VARCHAR` | nee | Pseudoniem van de burger (HMAC-SHA256 hash). Geen directe PII. Geindexeerd. |
| `provision_type` | `VARCHAR` | nee | Type voorziening dat is aangevraagd, bijvoorbeeld `huishoudelijke_hulp`. |
| `severity` | `VARCHAR` | nee | Ernst van de situatie zoals opgegeven door de burger: `laag`, `gemiddeld` of `hoog`. |
| `route` | `VARCHAR` | nee | Uitkomst van de routering: `auto_approve`, `human_review` of `auto_reject`. |
| `risk_level` | `VARCHAR` | nee | Risiconiveau bepaald door de AI: `low`, `medium` of `high`. |
| `confidence` | `FLOAT` | ja | Betrouwbaarheidsscore van de AI-aanbeveling (0.0 tot 1.0). Null als er geen AI is gebruikt. |
| `fairness_flags` | `TEXT` | nee | JSON-array van fairness-overtredingen, bijvoorbeeld `["religie", "nationaliteit"]`. Lege array als er geen vlaggen zijn. |
| `final_decision_status` | `VARCHAR` | nee | Eindstatus na eventuele menselijke beoordeling: `pending`, `approved`, `rejected` of `more_info`. |
| `processing_purpose` | `VARCHAR` | nee | Documenteert het AVG-verwerkingsdoel. Standaardwaarde: `wmo_intake`. |
| `retention_until` | `TIMESTAMP` | nee | Uiterste bewaardatum: `created_at + RETENTION_DAYS`. Na deze datum mag het record worden verwijderd. |
| `created_at` | `TIMESTAMP` | nee | Tijdstip van aanmaken van het record (UTC). |
| `problem_summary` | `TEXT` | ja | Geanonimiseerde samenvatting van de problemen van de burger, zonder PII. |
| `ai_recommendation` | `TEXT` | ja | De aanbeveling van de AI: `approve`, `reject` of `review`. |
| `ai_reasoning` | `TEXT` | ja | Toelichting van de AI op de aanbeveling, opgeslagen voor herleidbaarheid (EU AI Act art. 12). |
| `ai_confidence` | `FLOAT` | ja | Identiek aan `confidence`. Expliciet opgeslagen als AI-attribuut voor compliance-queries. |
| `ai_model` | `VARCHAR` | ja | Naam of versie van het gebruikte AI-model, bijvoorbeeld `stub-v1`. |

**Opmerking over `confidence` en `ai_confidence`.** Beide kolommen worden gevuld met dezelfde waarde vanuit `audit.py`. `confidence` is de algemene proceskolom; `ai_confidence` is het expliciete AI-logattribuut dat de EU AI Act vereist. Ze zijn identiek om zowel proces- als compliance-queries eenvoudig te houden.

---

## 4. Tabel `review_queue`

Aanvragen die menselijke beoordeling vereisen, worden in deze tabel geplaatst. Een aanvraag komt hier terecht als een of meer van de volgende condities gelden: `severity=hoog`, `multiple_problems=true`, `risk_level=high`, fairness-vlaggen aanwezig, of de AI-betrouwbaarheidsscore ligt onder de drempel (`CONFIDENCE_THRESHOLD`, standaard 0.7).

| Kolom | Type | Nullable | Beschrijving |
|---|---|---|---|
| `id` | `VARCHAR` (UUID) | nee | Primaire sleutel. Willekeurig gegenereerd UUID. |
| `application_id` | `VARCHAR` (UUID) | nee | Verwijzing naar de aanvraag. Geindexeerd. |
| `citizen_token` | `VARCHAR` | nee | Pseudoniem van de burger. Geen directe PII. |
| `provision_type` | `VARCHAR` | nee | Type voorziening dat is aangevraagd. |
| `severity` | `VARCHAR` | nee | Ernst van de situatie. |
| `risk_level` | `VARCHAR` | nee | Risiconiveau bepaald door de AI. |
| `fairness_flags` | `TEXT` | nee | JSON-array van fairness-overtredingen. |
| `status` | `VARCHAR` | nee | Huidige status van het reviewitem: `pending`, `approved`, `rejected` of `more_info`. Standaardwaarde: `pending`. |
| `assigned_to` | `VARCHAR` | ja | Optionele identifier van de beoordelaar aan wie de zaak is toegewezen. |
| `created_at` | `TIMESTAMP` | nee | Tijdstip van aanmaken (UTC). |
| `problem_summary` | `TEXT` | ja | Geanonimiseerde samenvatting van de problemen van de burger. |
| `ai_recommendation` | `TEXT` | ja | De aanbeveling van de AI. |
| `ai_reasoning` | `TEXT` | ja | Toelichting van de AI op de aanbeveling. |
| `ai_confidence` | `FLOAT` | ja | Betrouwbaarheidsscore van de AI (0.0 tot 1.0). |
| `ai_model` | `VARCHAR` | ja | Naam of versie van het gebruikte AI-model. |

**Relatie met `audit_logs`.** Na een beoordelaarsbeslissing werkt `audit.py` de kolom `final_decision_status` in `audit_logs` bij met de uitkomst. Zo bevat het auditlog altijd de definitieve status, ook als die pas later door een mens is vastgesteld.

---

## 5. Tabel `reviewer_decisions`

Deze tabel legt elke beslissing van een beoordelaar vast. Een record wordt aangemaakt wanneer een reviewer `POST /review/{applicationId}/decision` aanroept.

| Kolom | Type | Nullable | Beschrijving |
|---|---|---|---|
| `id` | `VARCHAR` (UUID) | nee | Primaire sleutel. |
| `review_queue_id` | `VARCHAR` (UUID) | nee | Verwijzing naar het bijbehorende record in `review_queue` (foreign key). |
| `application_id` | `VARCHAR` (UUID) | nee | Verwijzing naar de aanvraag. Geindexeerd. |
| `decision` | `VARCHAR` | nee | De genomen beslissing: `approved`, `rejected` of `more_info`. |
| `note` | `TEXT` | ja | Optionele toelichting van de beoordelaar. |
| `decided_at` | `TIMESTAMP` | nee | Tijdstip van de beslissing (UTC). |

---

## 6. Tabel `policy_embeddings`

Deze tabel is bedoeld voor een toekomstige RAG-implementatie (Retrieval-Augmented Generation) op beleidsregels. De pgvector-extensie maakt het mogelijk om semantisch te zoeken in beleidsteksten. De tabel wordt aangemaakt door `db/init.sql` en is nu leeg.

| Kolom | Type | Nullable | Beschrijving |
|---|---|---|---|
| `id` | `BIGSERIAL` | nee | Primaire sleutel, automatisch oplopend. |
| `provision_type` | `TEXT` | nee | Type voorziening waartoe dit tekstfragment behoort. |
| `chunk` | `TEXT` | nee | Een fragment van de beleidstekst. |
| `embedding` | `vector(384)` | ja | Vectorrepresentatie van het tekstfragment (384 dimensies). |
| `created_at` | `TIMESTAMPTZ` | nee | Tijdstip van aanmaken. Standaard: `now()`. |

Vulling van deze tabel is optioneel. Wanneer de RAG-functionaliteit wordt geactiveerd, kunnen beleidsdocumenten worden gesplitst in fragmenten en worden opgeslagen als embedding-vectoren.

---

## 7. Bewaartermijn (AVG)

Bij het aanmaken van elk record in `audit_logs` berekent de backend de uiterste bewaardatum:

```
retention_until = created_at + timedelta(days=RETENTION_DAYS)
```

`RETENTION_DAYS` heeft een standaardwaarde van 90 dagen (ingesteld in `backend/app/core/config.py`). De waarde kan worden overschreven via de omgevingsvariabele `RETENTION_DAYS` in `.env`.

Er is **geen automatische cleanup** ingebouwd in dit prototype. Het verwijderen van verlopen records is een handmatige beheertaak. De aanbevolen aanpak is een periodieke databasetaak of cronjob met de volgende SQL-query:

```sql
DELETE FROM audit_logs WHERE retention_until < now();
```

Voor omgevingen met strengere AVG-vereisten kan deze query worden ingepland als een Postgres-cronjob via `pg_cron`, of als een n8n-workflow die dagelijks wordt uitgevoerd.

---

## 8. Verwerkingsdoel (`processing_purpose`)

De kolom `processing_purpose` in `audit_logs` documenteert het AVG-verwerkingsdoel van elk record. Dit is vereist door AVG artikel 5(1)(b) (doelbinding): persoonsgegevens mogen alleen worden verwerkt voor het doel waarvoor ze zijn verzameld.

De standaardwaarde is `wmo_intake`. Dit geeft aan dat de verwerking uitsluitend plaatsvindt in het kader van het behandelen van een WMO-aanvraag. De waarde wordt ingesteld in `backend/app/services/audit.py` en is niet afhankelijk van gebruikersinvoer.

Als in de toekomst andere verwerkingsdoelen worden toegevoegd (bijvoorbeeld bezwaarprocedures of periodieke herbeoordelingen), moet een apart record worden aangemaakt met een passende waarde voor `processing_purpose`.

---

## 9. Pseudonimisering

De kolom `citizen_token` bevat nooit de echte identiteit van de burger. In plaats daarvan wordt een HMAC-SHA256 hash gebruikt:

```
citizen_token = HMAC-SHA256(citizenId, key=PSEUDONYM_SECRET)
```

**Stabiliteit.** Dezelfde `citizenId` levert altijd dezelfde `citizen_token` op, zolang `PSEUDONYM_SECRET` niet verandert. Hierdoor kunnen meerdere aanvragen van dezelfde burger aan elkaar worden gekoppeld zonder de echte identiteit op te slaan.

**Onomkeerbaarheid.** Zonder kennis van `PSEUDONYM_SECRET` is het niet mogelijk om de originele `citizenId` te reconstrueren uit de token. De token is wiskundig onomkeerbaar.

**Effect op de auditdatabase.** De tabellen `audit_logs`, `review_queue` en `reviewer_decisions` bevatten geen directe PII (naam, adres, geboortedatum). Omgekeer opzoeken van een burger in de auditdatabase is alleen mogelijk als zowel de `PSEUDONYM_SECRET` als de originele `citizenId` bekend zijn.

`PSEUDONYM_SECRET` is een omgevingsvariabele die in productie een sterk willekeurig gegenereerde waarde moet hebben. De standaardwaarde in `.env.example` (`local_dev_secret_change_me`) mag nooit in productie worden gebruikt.

---

## 10. Toegang via de API

De volgende API-endpoints bieden toegang tot het auditlog en de reviewwachtrij:

| Endpoint | Beschrijving |
|---|---|
| `GET /audit` | Alle auditrecords, filterbaar op `provision`, `route`, `risk` en `flag`. |
| `GET /audit/{applicationId}` | Een enkel auditrecord op basis van aanvraag-ID. |
| `GET /citizen/{token}/data` | Alle auditrecords voor een specifieke burger-token (AVG-inzageverzoek). |
| `GET /review/queue` | Alle items in de reviewwachtrij, filterbaar op status. |
| `POST /review/{applicationId}/decision` | Leg een beoordelaarsbeslissing vast. |

---

## 11. Inspectie via psql

Om de database lokaal te inspecteren terwijl de Docker Compose-stack actief is:

```bash
docker exec -it wmo-postgres psql -U wmo -d wmo
```

Handige commando's binnen de psql-sessie:

```bash
\dt
```

Toont alle tabellen in de database.

```sql
SELECT id, route, risk_level, fairness_flags, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

Toont de tien meest recente auditrecords.

```sql
SELECT id, status, assigned_to, created_at
FROM review_queue
WHERE status = 'pending'
ORDER BY created_at ASC;
```

Toont alle openstaande reviewitems, oudste eerst.

```sql
SELECT retention_until, count(*)
FROM audit_logs
GROUP BY retention_until
ORDER BY retention_until ASC;
```

Geeft een overzicht van wanneer welke records mogen worden verwijderd.

---

## 12. Reset en migratie

De backend roept `Base.metadata.create_all()` aan bij elke start. Dit commando maakt ontbrekende tabellen aan, maar wijzigt geen bestaande tabellen. Dat betekent:

- Als een tabel nog niet bestaat, wordt hij aangemaakt.
- Als een kolom is toegevoegd aan een bestaand ORM-model, wordt die kolom **niet** automatisch toegevoegd aan een bestaande tabel.

Voor schemawijzigingen na de eerste initialisatie zijn twee opties:

**Optie 1: volumes verwijderen (ontwikkelomgeving).**

```bash
docker compose down -v
docker compose up --build
```

Dit verwijdert alle data en maakt de database opnieuw aan. Alleen geschikt voor een lokale ontwikkelomgeving.

**Optie 2: handmatige migratie (productie of testomgeving met bestaande data).**

Voer de benodigde `ALTER TABLE`-statements handmatig uit via psql of een migratiescript. Voor productie-scenario's wordt het gebruik van een migratietool zoals Alembic aanbevolen.
