# Installatiehandleiding — WMO Zorgagent

**Versie:** 1.0
**Datum:** April 2026
**Doelpubliek:** Ontwikkelaar of beoordelaar die het prototype lokaal wil draaien.

---

## 1. Vereisten

### Software

| Vereiste | Minimale versie | Opmerking |
|---|---|---|
| Docker Desktop | 4.x | Inclusief Docker Compose v2 |
| Docker Compose | v2.x | Geïntegreerd in Docker Desktop |
| Git | 2.x | Voor het klonen van de repository |

### Besturingssysteem

| OS | Ondersteuning |
|---|---|
| macOS (Apple Silicon of Intel) | Volledig ondersteund |
| Linux (Ubuntu 22.04+, Debian 12+) | Volledig ondersteund |
| Windows 10/11 met WSL2 | Ondersteund via WSL2 — start Docker Desktop vanuit Windows en voer commando's uit in de WSL2-terminal |

### Vrije poorten

Controleer of de volgende poorten vrij zijn voor het starten.

| Poort | Service |
|---|---|
| 5173 | Frontend (Vite dev server) |
| 8000 | Backend (FastAPI) |
| 5433 | Postgres (extern; intern is 5432) |
| 5678 | n8n editor en webhook |

Controleer met:

```bash
lsof -i :5173 -i :8000 -i :5433 -i :5678
```

---

## 2. Repository klonen

```bash
git clone https://github.com/RoqueDEV/hackathon_5.git
cd hackathon_5
```

---

## 3. Omgeving instellen

Kopieer het voorbeeldbestand:

```bash
cp .env.example .env
```

Voor een lokale demo zijn de standaardwaarden voldoende. Onderstaande tabel geeft een overzicht van alle variabelen.

| Variabele | Standaardwaarde | Betekenis |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://wmo:wmo_local_dev@postgres:5432/wmo` | Connectie-URL voor de Postgres-database |
| `PSEUDONYM_SECRET` | `local_dev_secret_change_me` | Geheim voor HMAC-SHA256 pseudonimisering van burger-ID's. Verander dit in productie. |
| `CONFIDENCE_THRESHOLD` | `0.7` | AI-betrouwbaarheidsdrempel (0.0–1.0). Aanvragen onder de drempel gaan naar menselijke review. |
| `RETENTION_DAYS` | `90` | Bewaartermijn van audit-records in dagen (AVG-doelbinding). |
| `N8N_ENCRYPTION_KEY` | `local_dev_encryption_key_32_chars` | Encryptie-sleutel voor n8n-credentials. Minimaal 32 tekens. Verander dit in productie. |
| `N8N_BASIC_AUTH_USER` | `admin` | Gebruikersnaam voor de n8n webinterface. |
| `N8N_BASIC_AUTH_PASSWORD` | `admin_local_dev` | Wachtwoord voor de n8n webinterface. |
| `VITE_API_BASE_URL` | `http://localhost:8000` | URL van de backend, bereikbaar vanuit de browser. |
| `VITE_N8N_WEBHOOK_URL` | `http://localhost:5678/webhook/wmo-intake` | n8n webhook-URL voor de frontend. |

---

## 4. Stack opstarten

```bash
docker compose up --build
```

Dit commando bouwt de images en start alle services. De eerste keer duurt het langer omdat images worden gedownload en gebouwd.

### Overzicht van de services

| Container | Functie | Poort |
|---|---|---|
| `wmo-postgres` | Postgres 16 met pgvector-extensie. Sla audit-records en reviewstatus op. | 5433 (extern) |
| `wmo-backend` | FastAPI-backend. Verwerkt aanvragen, AI-aanbevelingen, fairness-checks en audit logging. | 8000 |
| `wmo-n8n-import` | Init-container. Importeert de workflow-JSON en activeert de workflow. Wordt eenmalig uitgevoerd (`restart: no`). | — |
| `wmo-n8n` | n8n editor en webhook-server. Orkestreert de aanvraagflow. | 5678 |
| `wmo-frontend` | Vite dev server met de React-interface. | 5173 |

### Status controleren

Alle services hebben een healthcheck. Wacht tot alle statussen `healthy` zijn (duurt ongeveer 60 seconden):

```bash
docker compose ps
```

Verwachte uitvoer als alles klaar is:

```
NAME              STATUS
wmo-postgres      running (healthy)
wmo-backend       running (healthy)
wmo-n8n-import    exited (0)
wmo-n8n           running
wmo-frontend      running
```

---

## 5. n8n eerste keer instellen

Ga naar [http://localhost:5678](http://localhost:5678).

Log in met basic auth:

| Veld | Waarde |
|---|---|
| Gebruikersnaam | `admin` |
| Wachtwoord | `admin_local_dev` |

n8n vraagt daarna om een owner-account aan te maken. Vul in:

- **E-mailadres:** `admin@local.test` (of een ander adres naar keuze)
- **Wachtwoord:** kies zelf een wachtwoord en onthoud het

De workflow `wmo-intake` is automatisch geïmporteerd door de `wmo-n8n-import` container. Controleer of de workflow actief is via het menu **Workflows**.

### Wachtwoord vergeten

Voer dit uit om het owner-account te resetten:

```bash
docker exec wmo-n8n n8n user-management:reset
```

Ga daarna opnieuw naar [http://localhost:5678](http://localhost:5678) en doorloop de owner-setup opnieuw.

---

## 6. Verifiëren dat het werkt

### Backend gezondheidscontrole

```bash
curl -s http://localhost:8000/health
```

Verwachte uitvoer:

```json
{"status": "ok"}
```

### Webhook beschikbaar

Stuur een minimale aanvraag naar de n8n webhook:

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{"citizenId":"test-001","provisionType":"rolstoel","severity":"laag","multipleProblems":false,"problemSummary":"Moeite met lopen in huis.","consentForAI":true}' \
  | python3 -m json.tool
```

De uitvoer bevat een `route` veld met waarde `auto` of `review` en een `citizenMessage`.

---

## 7. De vier testcases uitvoeren

Alle testcases kunnen ook worden uitgevoerd via de UI op [http://localhost:5173](http://localhost:5173) — klik een preset aan en verstuur.

### TC1 — Laag risico (verwacht: automatisch afgehandeld)

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "burger-tc1",
    "provisionType": "rolstoel",
    "severity": "laag",
    "multipleProblems": false,
    "problemSummary": "Moeite met lopen binnenshuis. Geen andere klachten.",
    "consentForAI": true
  }' | python3 -m json.tool
```

Verwacht: `"route": "auto"`, status `200`.

---

### TC2 — Hoog risico (verwacht: naar menselijke review)

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "burger-tc2",
    "provisionType": "rolstoel",
    "severity": "hoog",
    "multipleProblems": true,
    "problemSummary": "Ernstige moeite met lopen, hartklachten en meerdere valincidenten.",
    "consentForAI": true
  }' | python3 -m json.tool
```

Verwacht: `"route": "review"`, zichtbaar in het reviewer dashboard op [http://localhost:5173](http://localhost:5173).

---

### TC3 — Fairness-flag (verwacht: naar review met fairness-vlag)

```bash
curl -s -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "burger-tc3",
    "provisionType": "woningaanpassing",
    "severity": "midden",
    "multipleProblems": false,
    "problemSummary": "Aanvraag afgewezen vanwege nationaliteit van de aanvrager.",
    "consentForAI": true
  }' | python3 -m json.tool
```

Verwacht: `"route": "review"`, `"fairnessFlags"` bevat een of meer vlaggen.

---

### TC4 — Geen toestemming (verwacht: HTTP 400, geen AI-aanroep)

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "burger-tc4",
    "provisionType": "huishoudelijke_hulp",
    "severity": "laag",
    "multipleProblems": false,
    "problemSummary": "Hulp nodig bij het huishouden.",
    "consentForAI": false
  }'
```

Verwacht: `400`. De foutmelding bevat een Nederlandse tekst die aangeeft dat de aanvraag niet verwerkt kan worden zonder toestemming.

---

## 8. Database resetten

Dit verwijdert alle data, inclusief de Postgres- en n8n-volumes. Daarna moet de n8n owner-setup opnieuw worden doorlopen (zie sectie 5).

```bash
docker compose down -v && docker compose up --build
```

---

## 9. Logs bekijken

```bash
# Alle services tegelijk
docker compose logs -f

# Alleen de backend
docker compose logs -f backend

# Alleen n8n
docker compose logs -f n8n

# Alleen de init-container (workflow import)
docker compose logs n8n-import
```

---

## 10. Veelvoorkomende problemen

| Probleem | Oorzaak | Oplossing |
|---|---|---|
| `bind: address already in use` op poort 8000, 5173, 5433 of 5678 | Een ander proces gebruikt de poort. | Zoek het proces met `lsof -i :<poort>` en stop het, of pas de poortmapping aan in `docker-compose.yml`. |
| n8n vraagt om owner-account maar de workflow staat niet actief | De import-container is klaar voor n8n volledig op was. | Ga naar **Workflows** in n8n en activeer `wmo-intake` handmatig via de schakelaar. |
| `wmo-backend` blijft op `starting` staan | Postgres is nog niet klaar. | Wacht 30–60 seconden. Controleer met `docker compose ps`. Als het aanhoudt: `docker compose logs postgres`. |
| Frontend toont oude versie na een code-wijziging | Container is niet herbouwd. | Voer `docker compose up -d --build frontend` uit. |
| `curl` naar de webhook geeft `404` | n8n is nog niet klaar of de workflow is niet actief. | Controleer `docker compose logs n8n`. Activeer de workflow handmatig als dat nodig is (zie boven). |
| `wmo-n8n-import` toont `exited (1)` | Importfout, vaak door een volume-conflict. | Voer `docker compose down -v` uit en start opnieuw met `docker compose up --build`. |

---

## 11. Stoppen

Volume bewaren (data blijft beschikbaar bij volgende opstart):

```bash
docker compose down
```

Alles verwijderen inclusief volumes (schone lei):

```bash
docker compose down -v
```
