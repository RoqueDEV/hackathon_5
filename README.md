# WMO Zorgagent — Prototype

Een lokaal uitvoerbaar softwareprototype voor gemeenten die WMO-aanvragen sneller, zorgvuldiger en privacyvriendelijker willen verwerken met AI en workflow-automatisering. Gebouwd conform **AVG** en **EU AI Act**.

---

## Projectoverzicht

Het systeem verwerkt aanvragen voor WMO-voorzieningen (huishoudelijke hulp, rolstoel, woningaanpassing) via een end-to-end pipeline:

1. Ontvangst via REST API of n8n webhook
2. Validatie en data-minimalisatie
3. Pseudonimisering van burger-ID (HMAC-SHA256)
4. AI-aanbeveling (stub, deterministisch)
5. Fairness-check op verboden termen en redenering
6. Human-in-the-loop routing bij hoog risico
7. Transparant burgerbericht op B1-taalniveau
8. Volledige audit-logging in Postgres

---

## Stack

- **Frontend:** React 18 + Vite + TypeScript, gebouwd met Bun (`oven/bun` image)
- **Styling:** Tailwind CSS + shadcn/ui, Linear-geïnspireerde dark-mode SaaS UI
- **Backend:** Python 3.11 + FastAPI + Pydantic v2 + SQLAlchemy 2 + Uvicorn
- **Workflow:** n8n (workflow as code, JSON auto-import via volume)
- **Database:** Postgres 16 + pgvector extensie
- **Orkestratie:** Docker Compose
- **Optioneel (scale):** Redis + n8n-worker

---

## Vereisten

- **Docker Desktop** (versie 4.x of hoger) met Docker Compose v2
- **Bun** (optioneel, alleen voor lokale frontend-ontwikkeling buiten Docker)
- Poorten `5173`, `8000`, `5432`, `5678` vrij op localhost

---

## Starten

```bash
# 1. Omgevingsvariabelen instellen
cp .env.example .env

# 2. Alles bouwen en starten
docker compose up --build
```

Het systeem is gereed wanneer alle services healthy zijn (±60 seconden).

---

## Services en URLs

| Service | URL | Inloggegevens |
|---|---|---|
| Frontend | http://localhost:5173 | — |
| Backend API docs | http://localhost:8000/docs | — |
| n8n workflow editor | http://localhost:5678 | admin / admin_local_dev |
| Postgres | localhost:5432 | wmo / wmo_local_dev / db: wmo |

---

## Environment variabelen

Kopieer `.env.example` naar `.env` en pas waarden aan. Zie het `.env.example` bestand voor een toelichting per variabele.

Belangrijkste variabelen:

| Variabele | Standaard | Beschrijving |
|---|---|---|
| `PSEUDONYM_SECRET` | `local_dev_secret_change_me` | Geheim voor HMAC-pseudonimisering |
| `CONFIDENCE_THRESHOLD` | `0.7` | Drempel voor menselijke review |
| `RETENTION_DAYS` | `90` | Bewaartermijn audit-records (AVG) |
| `N8N_ENCRYPTION_KEY` | `local_dev_encryption_key_32_chars` | Encryptie voor n8n-credentials |

**Let op:** Verander alle secrets bij gebruik buiten de lokale ontwikkelomgeving.

---

## Database

De database wordt automatisch geïnitialiseerd via `db/init.sql` bij de eerste start van de Postgres-container.

### pgvector
De extensie `pgvector` maakt vectoropslag mogelijk in de tabel `policy_embeddings` (kolom `embedding vector(384)`). Dit is de basis voor toekomstige RAG-implementatie (Retrieval-Augmented Generation).

Alternatief vectorstore: **Qdrant** kan worden toegevoegd als aparte service in `docker-compose.yml` (`qdrant/qdrant` image, poort 6333). De backend heeft een aparte integratiepunt nodig via de policy-service.

### Database resetten
```bash
docker compose down -v   # verwijdert alle volumes inclusief data
docker compose up --build
```

---

## Frontend

De frontend wordt gebouwd met **Bun** via de `oven/bun:1-alpine` Docker image.

Voor lokale ontwikkeling buiten Docker:
```bash
cd frontend
bun install
bun run dev
```

### UI-richting
De interface is Linear-geïnspireerd (strak, dark mode, minimalistische SaaS-look). Voor referentie:
```bash
npx getdesign@latest add linear.app
```

Drie schermen:
1. **Burger intake** — aanvraagformulier + testmodus
2. **Reviewer dashboard** — wachtrij voor menselijke beoordeling
3. **Audit log** — overzicht van alle verwerkte aanvragen

---

## n8n

De n8n workflow (`n8n/workflows/wmo.json`) wordt automatisch beschikbaar gesteld via volume mount.

**Activeren na eerste start:**
1. Ga naar http://localhost:5678
2. Log in met `admin` / `admin_local_dev`
3. Open de workflow `WMO Intake Workflow`
4. Klik op de toggle om de workflow te activeren

De webhook is bereikbaar op: `http://localhost:5678/webhook/wmo-intake`

---

## Testcases uitvoeren

Maak het script uitvoerbaar en voer de 4 testcases uit:

```bash
chmod +x scripts/test-cases.sh
bash scripts/test-cases.sh
```

### Handmatige curl-voorbeelden

**Testcase 1 — Laag risico (automatische route):**
```bash
curl -s -X POST http://localhost:8000/applications \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "NL-BSN-001122334",
    "name": "Jan Jansen",
    "address": "Voorbeeldstraat 1, 1234 AA Voorbeeldstad",
    "dateOfBirth": "1958-06-15",
    "consentForAI": true,
    "provisionType": "rolstoel",
    "problemSummary": "Ik heb moeite met lopen en heb een rolstoel nodig.",
    "severity": "laag",
    "householdContext": {},
    "mobilityIssues": true,
    "multipleProblems": false,
    "submittedAt": "2026-04-16T09:00:00Z"
  }' | jq
```

**Testcase 4 — Geen toestemming (HTTP 400):**
```bash
curl -s -w "\nHTTP_STATUS: %{http_code}\n" \
  -X POST http://localhost:8000/applications \
  -H "Content-Type: application/json" \
  -d '{"citizenId": "NL-BSN-111222333", "name": "Petra Bakker",
       "address": "Kerkstraat 99", "dateOfBirth": "1990-08-14",
       "consentForAI": false, "provisionType": "rolstoel",
       "problemSummary": "test", "severity": "laag",
       "householdContext": {}, "mobilityIssues": true,
       "multipleProblems": false, "submittedAt": "2026-04-16T09:15:00Z"}'
```

**Audit logs opvragen:**
```bash
curl http://localhost:8000/audit | jq
```

---

## Optioneel: Scale-profiel (Redis + n8n-worker)

Voor productieachtige schaalbaarheid met meerdere n8n-workers en een taakwachtrij via Redis:

```bash
docker compose --profile scale up
```

Dit start extra services:
- `wmo-redis` op poort `6379`
- `wmo-n8n-worker` als aparte n8n-worker node

De n8n-worker neemt taken uit de Redis-wachtrij over van de hoofd-n8n-instantie.

---

## Externe webhooks (Cloudflare Tunnel)

n8n-webhooks zijn standaard alleen bereikbaar op localhost. Voor externe toegang (bijv. vanuit een testomgeving):

```bash
# Installeer cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:5678
```

Stel de gegenereerde URL in als `WEBHOOK_URL` in `.env` en herstart n8n.

Alternatief met ngrok:
```bash
ngrok http 5678
```

---

## Troubleshooting

| Probleem | Oplossing |
|---|---|
| Poort al in gebruik | Stop conflicterende services of pas poortnummers aan in `docker-compose.yml` |
| Backend start niet op | Controleer of Postgres healthy is: `docker compose ps` |
| n8n kan DB niet bereiken | Wacht tot `wmo-postgres` de healthcheck passeert |
| Database reset nodig | `docker compose down -v && docker compose up --build` |
| Frontend laadt niet | Controleer logs: `docker compose logs frontend` |
| Bun install mislukt | Verwijder `node_modules` en probeer opnieuw: `docker compose build --no-cache frontend` |

Logs van alle services:
```bash
docker compose logs -f
```

Logs van een specifieke service:
```bash
docker compose logs -f backend
```
