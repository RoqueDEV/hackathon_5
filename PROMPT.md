# Prompt voor Claude Opus 4.6 — WMO Zorgagent Prototype

> One-shot prompt voor Claude Opus 4.6 die een volledig werkend softwareprototype als monorepo genereert. Gebruikt **Claude Code superpowers skills** en dispatcht **Sonnet subagents** voor parallel werk. Lokaal draaibaar met Docker Compose. Frontend-tooling op **Bun**, UI-richting via `npx getdesign@latest add linear.app`.

---

## SYSTEM / ROL

Je bent Claude Opus 4.6 als senior full-stack engineer en solution architect. Ontwerp en implementeer een volledig werkend softwareprototype voor een gemeente die WMO-aanvragen sneller, zorgvuldiger en privacyvriendelijker wil verwerken met AI en workflow-automatisering, conform **AVG** en **EU AI Act**.

---

## WERKWIJZE — SKILLS EN SUBAGENTS (VERPLICHT)

Je werkt binnen Claude Code en hebt toegang tot superpowers skills en het `Agent` tool. Je **moet** deze workflow volgen:

### 1. Skills gebruiken
Roep deze skills aan via het `Skill` tool op het juiste moment:

- `superpowers:brainstorming` — **eerst**, voordat je aan feature-werk begint, om user intent en scope te verhelderen.
- `superpowers:writing-plans` — schrijf een implementatieplan met duidelijke, onafhankelijke taken.
- `superpowers:subagent-driven-development` — dispatch onafhankelijke taken naar Sonnet subagents.
- `superpowers:dispatching-parallel-agents` — bij 2+ onafhankelijke taken, parallel runnen.
- `superpowers:test-driven-development` — schrijf tests eerst voor backend services.
- `superpowers:systematic-debugging` — bij fouten; geen gokwerk.
- `superpowers:verification-before-completion` — **altijd** vóór "klaar"; draai `docker compose up --build` en de 4 testcases, bewijs dat het werkt.
- `frontend-design:frontend-design` — voor de React UI (Linear-geïnspireerde dark-mode SaaS look).
- `tailwind-design-system` — voor het design system van de frontend.

### 2. Subagents dispatchen (Sonnet)
Gebruik het `Agent` tool met `model: "sonnet"` en `subagent_type` passend bij de taak. **Dispatch in parallel** (meerdere `Agent` calls in één message) voor onafhankelijke werk-pakketten. Voorgestelde opsplitsing:

- **Subagent A (backend):** FastAPI app, routes, services, Pydantic models, SQLAlchemy, tests. `subagent_type: "general-purpose"`, `model: "sonnet"`.
- **Subagent B (frontend):** React + Vite + TS + Bun + Tailwind + shadcn/ui, 3 pagina's, API client. `subagent_type: "general-purpose"`, `model: "sonnet"`.
- **Subagent C (n8n workflow):** agentic workflow JSON export, webhook trigger, nodes voor validatie → pseudonimisering → minimalisatie → policy → AI → fairness → routing → audit → response. `subagent_type: "general-purpose"`, `model: "sonnet"`.
- **Subagent D (infra):** `docker-compose.yml`, Dockerfiles (frontend met Bun, backend met uv/pip), `db/init.sql` met pgvector, optionele Redis-service, `.env.example`. `subagent_type: "general-purpose"`, `model: "sonnet"`.

Elke subagent-prompt is **self-contained**: geef expliciete bestandspaden, interfaces en acceptatiecriteria mee. Subagents zien niet de hoofdconversatie.

### 3. Review en verificatie
- Na alle subagents: gebruik `feature-dev:code-reviewer` of `superpowers:requesting-code-review`.
- Draai `docker compose up --build`, test de 4 testcases, lees de audit logs uit Postgres, **bewijs** dat elke testcase werkt.
- Pas pas daarna: declareer klaar.

### 4. Isolatie (optioneel maar aanbevolen)
Gebruik `superpowers:using-git-worktrees` als je in een bestaande repo werkt om isolatie te garanderen.

---

## OPDRACHTGRENZEN

**Wel doen:**
- Lever alleen werkende software als monorepo.
- Volledige broncode, config, database, endpoints, frontend, n8n workflow, docs.
- Mocks/stubs waar nodig zodat het zonder externe API keys draait.
- Privacy-by-design, fairness, human-in-the-loop centraal.
- Alle docs in **Nederlands**, code/filenames/tech-comments in **Engels**.
- Eén commando opstart: `docker compose up --build`.
- Compliance: AVG (data-minimalisatie, doelbinding, bewaartermijn) en EU AI Act (transparantie, menselijk toezicht, logging).

**Niet doen:**
- Geen BPMN, architectuurplaatjes, presentaties, demo-scripts, feedbackdocumenten.
- Geen placeholders (`TODO`, `FIXME`, `implement later`, `mock this later`) en geen pseudocode.
- Geen PII (naam, adres, exacte DOB) naar AI-services.
- Geen dode code, geen half-af implementaties.

---

## PROJECTDOEL

End-to-end prototype dat:

1. Aanvragen ontvangt via webhook/API.
2. Validatie uitvoert en data minimaliseert.
3. Geen PII naar AI stuurt.
4. Persoonsgegevens pseudonimiseert (`citizenId → token` via HMAC-SHA256).
5. Beleidsregels ophaalt via mock policy service / statische data.
6. Een AI-service aanroept (stub-mode standaard) die een voorstel genereert.
7. Fairness-check uitvoert (verboden termen + onderbouwing + tone).
8. Complexe/risicovolle aanvragen naar een menselijke beoordelaar routeert.
9. De burger een transparant bericht geeft (B1 taalniveau).
10. Beslissingen + reasoning + flags logt in Postgres (audit log).

---

## VERPLICHTE STACK

- **Frontend:** React + Vite + TypeScript, package manager en runtime = **Bun** (`oven/bun` image).
- **Styling:** Tailwind CSS + shadcn/ui.
- **Design richting:** Linear-geïnspireerde dark-mode SaaS UI. Documenteer in README:
  ```bash
  npx getdesign@latest add linear.app
  ```
- **Backend:** Python 3.11 + FastAPI + Pydantic v2 + SQLAlchemy 2 + Uvicorn.
- **Workflow:** n8n (workflow as code, JSON export, auto-import via volume).
- **Database:** Postgres 16 met **pgvector** extensie (voor vectorstore + eventuele RAG-hooks).
- **Optioneel voor scale:** Redis + n8n workers (service aanwezig in compose maar default uit; documenteer hoe aan te zetten).
- **Lokale setup:** Docker Compose, één commando.

---

## INFRASTRUCTUUR CHECKLIST (verplicht afvinken)

- [x] n8n install via Docker Compose, Postgres als backing store, YAML compose file.
- [x] Vectorstore: **pgvector extensie** in de Postgres service (Qdrant als alternatief gedocumenteerd in README).
- [x] n8n environment variabelen gezet (`DB_TYPE=postgresdb`, credentials, `N8N_ENCRYPTION_KEY`, `N8N_HOST`, `WEBHOOK_URL`, `GENERIC_TIMEZONE=Europe/Amsterdam`).
- [x] Optionele `redis` service + `n8n-worker` service (commented/disabled by default, uit te zetten via env).
- [x] Documenteer localhost-limitatie: Cloudflare Tunnel / `ngrok` voorbeeld in README voor externe webhooks.
- [x] Agentic workflow in n8n: System message + LLM model selectie + settings + AVG/AI Act compliance nodes.
- [x] Log files van n8n + backend naar Postgres (geen memory-only).
- [x] Optioneel: n8n API key + aansluiten van externe AI in n8n (documenteer, default: interne FastAPI stub).
- [x] Test + Publish + Webhook aangemaakt in n8n workflow JSON.
- [x] Frontend gekoppeld aan webhook: React roept `POST /applications` (FastAPI) én/of n8n webhook direct aan.
- [x] Frontend leest audit logging uit Postgres via `GET /audit` endpoint.

---

## COMPLIANCE — AVG + EU AI ACT

Implementeer expliciet:

- **AVG:**
  - Data-minimalisatie vóór AI-call (zie B hieronder).
  - Pseudonimisering (zie C).
  - Doelbinding: log waarvoor data is gebruikt (`processing_purpose`).
  - Bewaartermijn veld in audit (`retention_until`), default 90 dagen, configureerbaar.
  - Rechten van betrokkene: endpoint `GET /citizen/{token}/data` dat alle data voor een token toont (access request).
- **EU AI Act:**
  - Transparantie: burgerbericht vermeldt expliciet dat AI is gebruikt.
  - Menselijk toezicht: human-in-the-loop bij hoog risico (zie G).
  - Logging: elke AI-beslissing logt `model`, `prompt_hash`, `input_hash`, `output`, `confidence`, `risk_level`, `timestamp`.
  - Classificatie: mark deze use case als **"high-risk AI system"** in de prompt charter.

---

## DESIGN-EISEN FRONTEND

- React + TS + Vite, gebouwd met Bun.
- Strakke, minimalistische SaaS-interface, Linear-geïnspireerd, primair **dark mode**.
- Cards, tabellen, status badges, filters, detailpanelen. Rustig, precies.
- 3 schermen:
  1. Citizen intake/test pagina
  2. Reviewer dashboard
  3. Audit log overzicht
- Gebruik `frontend-design:frontend-design` en `tailwind-design-system` skills tijdens implementatie.

---

## FUNCTIONELE EISEN

### A. Intake API
`POST /applications` — JSON input, valideer verplichte velden.
Bij `consentForAI=false`: stop flow, duidelijke foutmelding, geen AI-call, log in audit met `final_decision_status="rejected_no_consent"`.

### B. Data-minimalisatie
Vóór AI: verwijder naam, adres, exacte DOB, direct identificerende gegevens. Gebruik `ageGroup` (`<18`, `18-25`, `26-40`, `41-65`, `65+`).

### C. Pseudonimisering
`citizenId → token` via HMAC-SHA256 met lokale secret uit env. Alleen token in logs en downstream. Nooit `citizenId`, naam of adres naar AI.

### D. Policy service
`GET /policy/{provisionType}` — mock/statisch, minimaal:
- **Huishoudelijke hulp** — afhankelijk van zelfredzaamheid en context.
- **Rolstoel** — alleen bij mobiliteitsbeperking met onderbouwing.
- **Woningaanpassing** — alleen bij structurele beperking.

### E. AI recommendation service
`POST /ai/recommend` — ontvangt alleen geminimaliseerde input. Output:
- `recommendation`
- `reasoning`
- `confidence` (0–1)
- `risk_level` (`low` | `medium` | `high`)
- `model` (string, bijv. `stub-v1`)

Default **stub-mode** met voorspelbare output per testcase (deterministisch op basis van input-hash).

### F. Fairness-check
`POST /fairness/check` — detecteert:
- Verboden termen (religie, ras, nationaliteit, geslacht, seksuele geaardheid) — lijst uitbreidbaar via YAML/JSON config.
- Ontbrekende of zwakke reasoning (minimum lengte + keyword check).
- Te stellige conclusie zonder onderbouwing.

Output: `flags: string[]`, `passed: boolean`, `severity: "low"|"medium"|"high"`.

### G. Human-in-the-loop
Route naar review als één van deze waar is:
- `severity = hoog`
- `multipleProblems = true`
- `risk_level = high`
- fairness flags aanwezig
- `confidence < drempel` (default 0.7, configureerbaar)

Endpoints:
- `GET /review/queue`
- `POST /review/{applicationId}/decision` (`approve` | `reject` | `request-more-info`)

### H. Burgerbericht
Transparant, B1 niveau:
- AI is ondersteunend gebruikt.
- Bij complexe aanvragen kijkt een medewerker mee.
- Vervolgstap neutraal en begrijpelijk.
- Geen interne policy details of gevoelige info.

### I. Audit logging
Tabel `audit_logs` met minimaal: `application_id`, `citizen_token`, `provision_type`, `severity`, `risk_level`, `fairness_flags`, `ai_recommendation`, `reasoning`, `ai_model`, `ai_confidence`, `final_route`, `final_decision_status`, `processing_purpose`, `retention_until`, `created_at`. Log ook validatiefouten, consentfouten, reviewer acties.

---

## AGENTIC N8N WORKFLOW

Lever als JSON in `/n8n/workflows/wmo.json`. Flow:

1. **Webhook trigger** (`POST /webhook/wmo-intake`)
2. **Validate** (HTTP call naar FastAPI `/applications/validate` of inline Function node)
3. **Pseudonymize** (HTTP call naar FastAPI `/pseudonymize`)
4. **Minimize** (HTTP call naar FastAPI `/minimize`)
5. **Fetch policy** (HTTP call naar `/policy/{provisionType}`)
6. **AI recommendation node** met:
   - **System message:** rol, tone, AVG/AI Act regels, verboden inhoud — expliciet in node configuratie.
   - **LLM model:** configureerbaar via env (default: stub endpoint).
   - **Settings:** temperature, max tokens.
7. **Fairness check** (HTTP call naar `/fairness/check`)
8. **Route decision** (IF node op severity/risk/flags/confidence)
9. **Audit write** (HTTP call naar `/audit` of direct Postgres node)
10. **Response** (burgerbericht, consistent gestructureerd JSON)

Workflow wordt automatisch geïmporteerd bij n8n startup via volume mount + init-script.

---

## API-ENDPOINTS (minimum)

```
POST /applications
POST /applications/validate
POST /pseudonymize
POST /minimize
GET  /policy/{provisionType}
POST /ai/recommend
POST /fairness/check
GET  /review/queue
POST /review/{applicationId}/decision
GET  /audit
GET  /audit/{applicationId}
GET  /citizen/{token}/data
GET  /health
```

---

## DATABASE

Postgres 16 + pgvector. `db/init.sql` maakt:
- `CREATE EXTENSION IF NOT EXISTS vector;`
- Tabellen: `applications`, `audit_logs`, `review_queue`, `reviewer_decisions`, `policy_embeddings` (met `vector(384)` kolom, default leeg maar klaar voor gebruik).
- Indexen op `application_id`, `citizen_token`, `created_at`.

---

## DOCKER

`docker-compose.yml` met services:
- `frontend` — `oven/bun` image, port 5173, `bun install && bun run dev`.
- `backend` — Python 3.11, FastAPI + Uvicorn, port 8000.
- `postgres` — `pgvector/pgvector:pg16` image, port 5432, volume voor data, init via `./db/init.sql`.
- `n8n` — `n8nio/n8n` image, port 5678, `DB_TYPE=postgresdb`, volume voor `/home/node/.n8n`, workflows volume.
- `redis` *(optional, profile: `scale`)* — voor n8n workers.
- `n8n-worker` *(optional, profile: `scale`)* — `n8n worker` command.

Healthchecks op postgres, backend, n8n. `depends_on` correct. `.env.example` met alle vars.

---

## DATA MODEL

```
applicationId          UUID
citizenId              # alleen aan de rand
name                   # alleen aan de rand
address                # alleen aan de rand
dateOfBirth            # alleen aan de rand
ageGroup               # afgeleid, wel naar AI
consentForAI           boolean
provisionType          enum
problemSummary         text
severity               enum low|medium|high
householdContext       jsonb
mobilityIssues         boolean
multipleProblems       boolean
submittedAt            timestamptz
```

---

## PROMPT CHARTER

`/docs/prompt-charter.md` in Nederlands met:
- Scope: wat de AI wel/niet mag doen.
- Toon en stijl: vriendelijk, duidelijk, professioneel, B1.
- Veiligheidsrichtlijnen: geen medisch/financieel/juridisch advies zonder disclaimer.
- Gevoelige informatie: privacy, vertrouwelijkheid, geen PII in output.
- Tools: geen externe calls buiten whitelist.
- AI Act classificatie: **high-risk AI system**.
- Bewaartermijn en verwijderrecht.

---

## README (Nederlands)

`README.md` met:
- Projectoverzicht.
- Stack.
- Start: `docker compose up --build`.
- Environment variabelen (`.env.example` uitgelegd).
- Database init en pgvector uitleg.
- Frontend URL + Bun gebruik (`bun install`, `bun run dev`).
- n8n URL + workflow import.
- Hoe `npx getdesign@latest add linear.app` te gebruiken voor UI-richting.
- Cloudflare Tunnel voorbeeld voor externe webhook.
- Optionele scale-profile aanzetten (`docker compose --profile scale up`).
- 4 testcases met `curl` voorbeelden.

---

## TESTCASES (reproduceerbaar)

1. **Laag risico** — neutrale aanvraag → automatisch burgerbericht, geen review.
2. **Hoog risico** — multipleProblems + severity=hoog → review, zichtbaar in dashboard.
3. **Fairness-flag** — AI-output bevat verboden term → flag + review.
4. **Validatie faalt** — `consentForAI=false` → foutmelding, geen AI-call, audit log met foutstatus.

Lever `scripts/test-cases.sh` met de 4 `curl` calls.

---

## MONOREPO STRUCTUUR

```
/project-root
  /frontend
    /src
      /components
      /pages        # Intake, ReviewerDashboard, AuditLog
      /lib          # apiClient, types
      App.tsx
      main.tsx
    index.html
    package.json
    bun.lockb
    vite.config.ts
    tailwind.config.ts
    Dockerfile
  /backend
    /app
      /routes       # applications, policy, ai, fairness, review, audit, citizen
      /services     # pseudonymizer, minimizer, ai_stub, fairness, policy, audit
      /models       # pydantic + sqlalchemy
      /core         # config, security, db, logging
      main.py
    /tests
    pyproject.toml
    Dockerfile
  /n8n
    /workflows
      wmo.json
    import.sh
  /db
    init.sql
  /docs
    prompt-charter.md
  /scripts
    test-cases.sh
  docker-compose.yml
  .env.example
  README.md
```

---

## CODING STANDARDS

- Backend: type hints overal, Pydantic v2 IO, `Depends`, geen globale state, geen bare `except`, structured logging (JSON).
- Frontend: TypeScript strict, functional components + hooks, centrale `apiClient`, React Router.
- Geen dode code, geen placeholder strings, geen uitgecommentarieerde blokken.
- Comments alleen waar het *waarom* niet uit de code blijkt.
- Secrets via env vars, veilige defaults in `.env.example`.
- Tests: backend unit tests voor services + integration test per endpoint (pytest).

---

## EXECUTIE-VOLGORDE (volg strikt)

1. **Skill:** `superpowers:brainstorming` — bevestig scope.
2. **Skill:** `superpowers:writing-plans` — schrijf plan naar `/docs/plan.md`.
3. **Parallel dispatch** 4 Sonnet subagents (A/B/C/D hierboven) in één message met meerdere `Agent` calls.
4. Wacht op alle subagents, integreer outputs.
5. **Skill:** `superpowers:verification-before-completion` — draai `docker compose up --build`, run `scripts/test-cases.sh`, verifieer audit logs in Postgres.
6. **Skill:** `feature-dev:code-reviewer` — review, fix gevonden issues.
7. Lever eindresultaat met bewijs (logs, curl output, screenshot-beschrijvingen).

---

## OUTPUTFORMAAT

Geef je antwoord **exact** in dit formaat:

### DEEL 1 — KORTE AANPAK
Max 10 bullets: gekozen softwareopzet, skill-/subagent-strategie, belangrijke keuzes.

### DEEL 2 — PROJECTSTRUCTUUR
Volledige tree van de monorepo.

### DEEL 3 — ALLE BESTANDEN
Voor elk bestand exact:

````
### Bestand: pad/naar/bestand.ext
```taal
<volledige inhoud>
```
````

### DEEL 4 — VERIFICATIE
- Output van `docker compose up --build` (samenvatting).
- Output per testcase (curl + response).
- Query output uit `audit_logs` die bewijst dat elke case correct is gelogd.

Lever alles volledig. Geen placeholders. Geen onvolledige bestanden.
