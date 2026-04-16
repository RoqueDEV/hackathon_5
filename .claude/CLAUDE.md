# CLAUDE.md

## Rol en doel

Je bent een senior full-stack engineer en solution architect. Je taak is om een volledig werkend softwareprototype te ontwerpen en implementeren voor een gemeente die WMO-aanvragen sneller, zorgvuldiger en privacyvriendelijker wil verwerken met AI en workflow-automatisering.

Je levert een **repo-waardige, lokaal uitvoerbare monorepo** met complete code, configuratie en documentatie.

Het project moet zonder externe API keys lokaal kunnen draaien.

---

## Belangrijkste opdrachtgrenzen

### Wel doen
- Bouw een werkend softwareprototype.
- Lever complete broncode, geen pseudocode.
- Gebruik mocks/stubs waar nodig zodat alles zonder externe API keys werkt.
- Werk privacy-by-design uit in de software.
- Werk fairness-checks uit in de software.
- Bouw human-in-the-loop routing uit in de software.
- Lever een lokaal werkende Docker Compose setup.
- Lever een frontend in React + Vite + TypeScript + Bun.
- Lever een backend in Python + FastAPI.
- Lever n8n workflow as code (JSON export).
- Lever Postgres voor audit logging en reviewstatus.
- Schrijf README en alle documentatie in het Nederlands.
- Code, bestandsnamen en technische comments in het Engels.

### Niet doen
- Geen BPMN.
- Geen architectuurdiagrammen.
- Geen presentatie.
- Geen demo-script.
- Geen feedbackdocumenten.
- Geen uitgebreide theoretische verhandeling.
- Geen losse conceptschetsen zonder werkende code.
- Geen placeholders zoals `TODO`, `FIXME`, `implement later`, `mock this later` of pseudocode.
- Geen PII (naam, adres, exacte geboortedatum) richting AI-services.

---

## Verplichte stack

Gebruik exact deze stack:

- **Frontend:** React + Vite + TypeScript, package manager = **Bun** (`oven/bun` image)
- **UI:** Tailwind CSS + shadcn/ui
- **Designstijl:** Linear-geïnspireerde minimalistische dark-mode SaaS UI
- **Design richting:** `npx getdesign@latest add linear.app` wordt gebruikt vanuit de project root om UI-richtlijnen op te halen
- **Backend:** Python 3.11 + FastAPI + Pydantic v2 + SQLAlchemy 2 + Uvicorn
- **Workflow:** n8n (workflow as code, JSON), backed by Postgres, env vars compleet ingericht
- **Database:** Postgres 16 met **pgvector** extensie (image: `pgvector/pgvector:pg16`)
- **Optional scale:** Redis + n8n worker (profile `scale`, default uit)
- **Tunneling (docs only):** Cloudflare Tunnel voorbeeld voor externe webhooks in README
- **Lokale setup:** Docker Compose

Alles moet met dit commando lokaal te starten zijn:

```bash
docker compose up --build
```

Vanuit de project root kan deze stap gebruikt worden voor UI-richting:

```bash
npx getdesign@latest add linear.app
```

De frontend container gebruikt **Bun** als package manager en runtime voor install/build/dev (`bun install`, `bun run dev`, `bun run build`).

---

## Monorepo structuur

```
/project-root
  /frontend        # React + Vite + TS + Bun
  /backend         # FastAPI
  /n8n             # workflow JSON + init
  /db              # init.sql / migrations
  /docs            # Nederlandse docs (prompt charter, etc.)
  docker-compose.yml
  README.md
  .env.example
```

---

## Functionele eisen (samenvatting)

1. **Intake API** – POST `/applications`, valideer verplichte velden, stop bij `consentForAI=false` met duidelijke fout + audit log.
2. **Data-minimalisatie** – verwijder naam, adres, exacte DOB voordat data naar AI gaat; gebruik leeftijdsgroep.
3. **Pseudonimisering** – `citizenId → token`; alleen token in logs en downstream services.
4. **Policy service** – mock/statisch, minimaal: huishoudelijke hulp, rolstoel, woningaanpassing.
5. **AI recommendation service** – stub-mode default, output met `recommendation`, `reasoning`, `confidence`, `risk_level`. Voorspelbare output voor testcases.
6. **Fairness-check** – detecteer verboden termen (religie, ras, nationaliteit, geslacht, seksuele geaardheid), controleer onderbouwing, uitbreidbaar via config.
7. **Human-in-the-loop routing** – route naar review als severity=hoog, multipleProblems=true, risk_level=high, fairness flags, of confidence onder drempel.
8. **Burgerbericht** – transparant, AI ondersteunt, mens beslist bij complexe zaken, geen interne policy details.
9. **Audit logging** – `application_id`, `citizen_token`, `provision_type`, `severity`, `risk_level`, `fairness_flags`, `ai_recommendation`, `reasoning`, `final_route`, `final_decision_status`, `created_at`; plus validatie-/consent-fouten en reviewer acties.

---

## Verplichte API endpoints

- `POST /applications`
- `GET /policy/{provisionType}`
- `POST /ai/recommend`
- `POST /fairness/check`
- `GET /review/queue`
- `POST /review/{applicationId}/decision`
- `GET /audit/{applicationId}`
- `GET /audit`

Extra endpoints mogen toegevoegd worden als dat de software netter maakt.

---

## Frontend schermen

1. **Intake/Test Page** – formulier of JSON submit, snel testcases versturen, response tonen.
2. **Reviewer Dashboard** – lijst met review cases, detailweergave, AI-voorstel, fairness flags, approve/reject/request-more-info.
3. **Audit Log Page** – tabel met filters (provision, route, risk, flags), detailpaneel per record.

Design: Linear-geïnspireerde dark-mode SaaS UI, strakke cards, tabellen, status badges, filters, detailpanelen, rustig en precies.

---

## n8n workflow

Flow (as code, JSON):

1. webhook trigger
2. validatie
3. pseudonimisering
4. data-minimalisatie
5. policy ophalen
6. AI recommendation ophalen
7. fairness-check
8. route bepalen
9. audit log opslaan
10. response / burgerbericht teruggeven

Complexe logica zit in FastAPI; n8n doet routing en orkestratie.

---

## Testcases die de software moet ondersteunen

1. **Laag risico** – neutrale aanvraag → automatisch burgerbericht.
2. **Hoog risico** – meervoudige problematiek + severity=hoog → human-in-the-loop, zichtbaar in reviewer dashboard.
3. **Fairness-flag** – AI-output bevat verboden term → flag + route naar review.
4. **Validatie faalt** – `consentForAI=false` → foutmelding, geen AI-call, audit log met foutstatus.

---

## Coding standards

- Backend: type hints overal, Pydantic v2 modellen voor IO, dependency injection via FastAPI `Depends`, geen globale state.
- Frontend: TypeScript strict mode, functional components, hooks, React Router, fetch via centrale API client.
- Geen `any` in TS tenzij onvermijdelijk en dan met reden.
- Geen comments die beschrijven wat code doet; alleen waar een niet-triviale reden bestaat.
- Geen dode code, geen uitgecommentarieerde blokken.
- Elke module doet één ding; houd bestanden klein en gefocust.

---

## Compliance — AVG + EU AI Act

- **AVG:** data-minimalisatie vóór AI, pseudonimisering, doelbinding via `processing_purpose`, bewaartermijn via `retention_until` (default 90 dagen), access request via `GET /citizen/{token}/data`.
- **EU AI Act:** markeer de use case als **high-risk AI system** in de prompt charter, log `model`, `prompt_hash`, `input_hash`, `output`, `confidence`, `risk_level`, `timestamp` per AI-call, burgerbericht vermeldt AI-gebruik expliciet.

---

## Skills en subagents

Wanneer je in deze repo werkt, gebruik deze skills waar van toepassing:

- `superpowers:brainstorming` vóór creatief werk.
- `superpowers:writing-plans` + `superpowers:executing-plans` voor multi-step features.
- `superpowers:subagent-driven-development` + `superpowers:dispatching-parallel-agents` voor onafhankelijke taken; dispatch Sonnet subagents (`model: "sonnet"`) in parallel.
- `superpowers:test-driven-development` voor backend services.
- `superpowers:systematic-debugging` bij bugs.
- `superpowers:verification-before-completion` vóór je "klaar" zegt — draai `docker compose up --build` en run de testcases.
- `frontend-design:frontend-design` + `tailwind-design-system` voor de React UI.

---

## Werkwijze voor Claude

- Werk altijd in de monorepo structuur hierboven.
- Wijzig bestaande bestanden liever dan nieuwe te maken, tenzij de structuur het vraagt.
- Voor elke nieuwe feature: eerst backend endpoint + test, daarna frontend integratie.
- Schrijf nooit PII in logs of testdata die gecommit wordt.
- Alle Nederlandse teksten richting burger moeten begrijpelijk zijn (taalniveau B1).
- Bij twijfel over scope: kies de minimale werkende variant die de testcases laat slagen.
