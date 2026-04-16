# WMO Zorgagent — Prototype

Een lokaal uitvoerbaar softwareprototype voor gemeenten die WMO-aanvragen sneller, zorgvuldiger en privacyvriendelijker willen verwerken met AI en workflow-automatisering. Gebouwd conform **AVG** en **EU AI Act** (high-risk AI system).

n8n is de orkestrator van de volledige aanvraagpipeline. De frontend stuurt aanvragen rechtstreeks naar de n8n-webhook. De FastAPI-backend levert gespecialiseerde diensten (pseudonimisering, AI-aanbeveling, fairness-check, audit-logging) die n8n aanroept via HTTP.

---

![WMO Workflow Canvas](docs/screenshots/wmo-workflow-canvas.png)

---

## Snelstart

```bash
# 1. Omgevingsvariabelen instellen
cp .env.example .env

# 2. Alles bouwen en starten
docker compose up --build
```

Het systeem is gereed wanneer alle services healthy zijn (doorgaans binnen 60 tot 90 seconden). Controleer de status met `docker compose ps`.

### Services en URLs

| Service | URL | Inloggegevens |
|---|---|---|
| Frontend | http://localhost:5173 | — |
| Backend API-docs | http://localhost:8000/docs | — |
| n8n workflow-editor | http://localhost:5678 | admin / admin_local_dev |
| Postgres | localhost:5433 | wmo / wmo_local_dev / db: wmo |

---

## n8n — eerste keer opstarten

Na de eerste start vraagt n8n om een owner-account aan te maken.

1. Ga naar http://localhost:5678
2. Log in met basic auth: gebruikersnaam `admin`, wachtwoord `admin_local_dev`
3. n8n toont een eigen owner-setup wizard. Vul een e-mailadres in (bijv. `admin@local.test`) en kies een wachtwoord
4. De workflow `WMO Intake` is al actief — de `n8n-import` init-container heeft dit automatisch gedaan bij opstarten. Er is geen handmatige activatie nodig

Als je het wachtwoord vergeten bent:

```bash
docker exec wmo-n8n n8n user-management:reset
```

---

## Testcases

De vier testcases zijn ook beschikbaar als presets op http://localhost:5173 (Intake-pagina). Curl-voorbeelden hieronder werken direct na `docker compose up --build`.

### Testcase 1 — Laag risico (automatische route)

Verwacht resultaat: n8n verwerkt de aanvraag volledig automatisch en geeft een burgerbericht terug met `route: "auto"`.

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-BSN-001122334",
    "name": "Jan Jansen",
    "address": "Voorbeeldstraat 1, 1234 AA Voorbeeldstad",
    "dateOfBirth": "1958-06-15",
    "consentForAI": true,
    "provisionType": "rolstoel",
    "problemSummary": "Ik heb moeite met lopen en heb een rolstoel nodig om zelfstandig te kunnen bewegen.",
    "severity": "laag",
    "householdContext": {"samenwonend": false, "kinderen": 0},
    "mobilityIssues": true,
    "multipleProblems": false,
    "submittedAt": "2026-04-16T09:00:00Z"
  }' | python3 -m json.tool
```

### Testcase 2 — Hoog risico (human-in-the-loop)

Verwacht resultaat: `severity=hoog` en `multipleProblems=true` zorgen voor `route: "review"`. De aanvraag verschijnt in het reviewer-dashboard op http://localhost:5173/review.

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-BSN-556677889",
    "name": "Maria de Vries",
    "address": "Testlaan 42, 5678 BB Testdorp",
    "dateOfBirth": "1942-11-03",
    "consentForAI": true,
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Ik kan het huishouden niet meer bijhouden vanwege chronische rugklachten en hartproblemen. Mijn partner is ook ziek.",
    "severity": "hoog",
    "householdContext": {"samenwonend": true, "partner_ook_beperkt": true, "kinderen": 0},
    "mobilityIssues": true,
    "multipleProblems": true,
    "submittedAt": "2026-04-16T09:05:00Z"
  }' | python3 -m json.tool
```

### Testcase 3 — Fairness-flag (review via verboden term)

Verwacht resultaat: de fairness-check detecteert een verboden term in de probleemomschrijving. De aanvraag gaat naar `route: "review"` en bevat een `fairness_flags` veld in de audit-log.

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-BSN-998877665",
    "name": "Ahmed El Amrani",
    "address": "Mozartstraat 7, 9012 CC Voorbeeldstad",
    "dateOfBirth": "1975-03-22",
    "consentForAI": true,
    "provisionType": "woningaanpassing",
    "problemSummary": "Door mijn godsdienst kan ik bepaalde ruimten in huis niet goed gebruiken en heb ik een aanpassing nodig.",
    "severity": "midden",
    "householdContext": {"samenwonend": true, "kinderen": 3},
    "mobilityIssues": false,
    "multipleProblems": false,
    "submittedAt": "2026-04-16T09:10:00Z"
  }' | python3 -m json.tool
```

### Testcase 4 — Geen toestemming (validatie afgewezen)

Verwacht resultaat: n8n weigert de aanvraag direct na validatie omdat `consentForAI=false`. Er wordt geen AI-call gedaan. De foutmelding en audit-log bevatten de redenering. De aanvraag verlaat de workflow via de fout-tak.

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-BSN-111222333",
    "name": "Petra Bakker",
    "address": "Kerkstraat 99, 3456 DD Voorbeeldstad",
    "dateOfBirth": "1990-08-14",
    "consentForAI": false,
    "provisionType": "rolstoel",
    "problemSummary": "Ik heb een rolstoel nodig.",
    "severity": "laag",
    "householdContext": {},
    "mobilityIssues": true,
    "multipleProblems": false,
    "submittedAt": "2026-04-16T09:15:00Z"
  }' | python3 -m json.tool
```

Alle vier testcases als script uitvoeren:

```bash
bash scripts/test-cases.sh
```

Audit-logs opvragen:

```bash
curl http://localhost:8000/audit | python3 -m json.tool
```

---

## Stack

| Laag | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript, package manager: Bun (`oven/bun` image) |
| Styling | Tailwind CSS + shadcn/ui, Linear-geïnspireerde dark-mode SaaS UI |
| Backend | Python 3.11 + FastAPI + Pydantic v2 + SQLAlchemy 2 + Uvicorn |
| Workflow-orkestrator | n8n (workflow as code, JSON), automatisch geïmporteerd via `n8n-import` init-container |
| Database | Postgres 16 + pgvector extensie (`pgvector/pgvector:pg16`) |
| Orkestratie | Docker Compose |
| Optioneel (scale-profiel) | Redis 7 + n8n-worker |

---

## n8n-workflow architectuur

De workflow `WMO Intake` bestaat uit 6 secties met in totaal 26 nodes:

| Sectie | Wat er gebeurt |
|---|---|
| Ontvangst & validatie | Webhook ontvangst, validatie via backend, foutrespons bij ongeldige input of geen toestemming |
| Privacy (AVG) | Pseudonimisering van burger-ID (HMAC-SHA256), verwijdering van PII vóór verdere verwerking |
| Beleid | WMO-beleidsregels ophalen per voorziening (huishoudelijke hulp, rolstoel, woningaanpassing) |
| AI-advies | AI-aanbeveling ophalen (stub, deterministisch), uitvoer met `recommendation`, `confidence`, `risk_level` |
| Fairness & routing | Fairness-check op verboden termen, routebeslissing: `auto`, `review` of `afgewezen` |
| Audit & burgerbericht | Audit-log schrijven naar Postgres, burgerbericht samenstellen en terugsturen |

De workflow heeft 3 route-lanes: automatische verwerking (`auto`), menselijke review (`review`) en afwijzing bij ontbrekende toestemming (`afgewezen`).

---

## Backend-endpoints

De backend (`http://localhost:8000`) biedt de volgende endpoints. Volledige documentatie via Swagger UI op `/docs`.

| Endpoint | Methode | Beschrijving |
|---|---|---|
| `/health` | GET | Statuscheck |
| `/applications` | POST | Deprecated — gebruik de n8n-webhook |
| `/applications/validate` | POST | Validatie voor n8n-stap |
| `/pseudonymize` | POST | Burger-ID naar token (HMAC-SHA256) |
| `/minimize` | POST | Verwijder PII uit aanvraagdata |
| `/policy/{provisionType}` | GET | Beleidsregels per voorziening |
| `/ai/recommend` | POST | AI-aanbeveling (stub) |
| `/fairness/check` | POST | Fairness-check op verboden termen |
| `/route/decide` | POST | Routebeslissing bepalen |
| `/audit/write` | POST | Audit-record opslaan |
| `/audit` | GET | Alle audit-records (filterbaar) |
| `/audit/{id}` | GET | Enkelvoudig audit-record |
| `/review/queue` | GET | Wachtrij voor menselijke review |
| `/review/{applicationId}/decision` | POST | Reviewbeslissing opslaan |
| `/citizen/{token}/data` | GET | Inzageverzoek burger (AVG) |

---

## Environment variabelen

Kopieer `.env.example` naar `.env` en pas de waarden aan. Verander alle secrets bij gebruik buiten de lokale ontwikkelomgeving.

| Variabele | Standaard | Beschrijving |
|---|---|---|
| `PSEUDONYM_SECRET` | `local_dev_secret_change_me` | Geheim voor HMAC-pseudonimisering |
| `CONFIDENCE_THRESHOLD` | `0.7` | Drempel voor menselijke review |
| `RETENTION_DAYS` | `90` | Bewaartermijn audit-records (AVG) |
| `N8N_ENCRYPTION_KEY` | `local_dev_encryption_key_32_chars` | Encryptie voor n8n-credentials |
| `N8N_BASIC_AUTH_USER` | `admin` | Gebruikersnaam n8n |
| `N8N_BASIC_AUTH_PASSWORD` | `admin_local_dev` | Wachtwoord n8n |

---

## Optioneel: scale-profiel

Voor productieachtige schaalbaarheid met meerdere n8n-workers en een taakwachtrij via Redis:

```bash
docker compose --profile scale up
```

Dit start extra services: `wmo-redis` op poort `6379` en `wmo-n8n-worker` als aparte n8n-worker node.

---

## Externe webhooks (Cloudflare Tunnel)

n8n-webhooks zijn standaard alleen bereikbaar op localhost. Voor externe toegang:

```bash
cloudflared tunnel --url http://localhost:5678
```

Stel de gegenereerde URL in als `WEBHOOK_URL` in `.env` en herstart n8n. Zie de [Cloudflare documentatie](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) voor installatie.

---

## Documentatie

| Document | Inhoud |
|---|---|
| [docs/prompt-charter.md](docs/prompt-charter.md) | AI-gebruik, EU AI Act classificatie, promptverantwoording |
| [docs/architectuur.md](docs/architectuur.md) | Systeemarchitectuur, componentoverzicht, datastromen |
| [docs/n8n-workflow.md](docs/n8n-workflow.md) | n8n-workflow in detail, node-beschrijvingen, uitbreidingen |
| [docs/endpoints.md](docs/endpoints.md) | Volledige API-referentie met request/response-voorbeelden |
| [docs/audit-database.md](docs/audit-database.md) | Databaseschema, audit-tabellen, bewaartermijnen |
| [docs/installatie.md](docs/installatie.md) | Gedetailleerde installatie en configuratie-instructies |
| [docs/bpmn.md](docs/bpmn.md) | Procesomschrijving van de aanvraagpipeline |

---

## Troubleshooting

| Probleem | Oplossing |
|---|---|
| Poort al in gebruik | Stop conflicterende services of pas poortnummers aan in `docker-compose.yml` |
| Backend start niet op | Wacht tot Postgres healthy is: `docker compose ps` |
| n8n kan database niet bereiken | Wacht tot `wmo-postgres` de healthcheck passeert; n8n-import start daarna automatisch |
| n8n-workflow niet actief | Controleer of `n8n-import` succesvol is afgesloten: `docker compose logs n8n-import` |
| Owner-setup vergeten | `docker exec wmo-n8n n8n user-management:reset` |
| Database reset nodig | `docker compose down -v && docker compose up --build` |
| Frontend laadt niet | `docker compose logs frontend` |
| Bun install mislukt | `docker compose build --no-cache frontend` |

Logs van alle services:

```bash
docker compose logs -f
```

Logs van een specifieke service:

```bash
docker compose logs -f backend
docker compose logs -f n8n
```

---

## Projectstructuur

```
/
├── frontend/               # React 18 + Vite + TypeScript + Bun
│   └── src/
│       └── pages/
│           ├── IntakePage.tsx          # Aanvraagformulier + testpresets
│           ├── ReviewerDashboardPage.tsx  # Wachtrij menselijke review
│           └── AuditLogPage.tsx        # Overzicht audit-records
├── backend/                # Python 3.11 + FastAPI
│   └── app/
│       ├── routes/         # API-endpoints
│       ├── services/       # Bedrijfslogica (AI, fairness, pseudonimisering)
│       └── models/         # Pydantic v2 schema's
├── n8n/
│   └── workflows/
│       └── wmo.json        # Workflow as code (automatisch geïmporteerd)
├── db/
│   └── init.sql            # Postgres-initialisatie + pgvector
├── docs/
│   ├── screenshots/        # Schermafbeeldingen
│   └── prompt-charter.md   # AI-gebruik en EU AI Act verantwoording
├── scripts/
│   └── test-cases.sh       # 4 integratietestcases
├── docker-compose.yml
├── .env.example
└── README.md
```
