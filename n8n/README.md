# n8n — WMO Intake Workflow

## n8n openen

Na `docker compose up --build` is n8n bereikbaar op:

```
http://localhost:5678
```

Inloggen met basic auth (zie `.env.example`):
- Gebruikersnaam: `admin`
- Wachtwoord: `admin_local_dev`

## Workflow auto-import

Bij de eerste start koppelt Docker Compose de map `n8n/workflows/` als volume aan `/home/node/.n8n/workflows/` in de container. n8n importeert JSON-bestanden in die map automatisch bij het opstarten.

**Als de auto-import niet werkt**, importeer je handmatig:

1. Ga naar **Workflows** in het linkermenu.
2. Klik op **Add Workflow** → **Import from File**.
3. Selecteer `n8n/workflows/wmo.json`.
4. Klik **Save**.

## Workflow activeren

Zet de toggle rechtsboven in het workflowscherm op **Active**. Pas dan reageert de webhook.

## Webhook URL

```
http://localhost:5678/webhook/wmo-intake
```

## Testen met curl

Gebruik onderstaand voorbeeld (testcase 1: standaard aanvraag, verwacht auto-route):

```bash
curl -X POST http://localhost:5678/webhook/wmo-intake \
  -H "Content-Type: application/json" \
  -d '{
    "citizenId": "900000001",
    "name": "Jan de Vries",
    "address": "Hoofdstraat 1, 1234AB Amsterdam",
    "dateOfBirth": "1958-03-15",
    "consentForAI": true,
    "provisionType": "huishoudelijke_hulp",
    "problemSummary": "Moeite met huishoudelijke taken door artrose.",
    "severity": "midden",
    "householdContext": {"alleenstaand": true},
    "mobilityIssues": false,
    "multipleProblems": false,
    "submittedAt": "2026-04-16T09:00:00Z"
  }'
```

Verwacht antwoord:

```json
{
  "applicationId": "<uuid>",
  "route": "auto",
  "citizenMessage": "...",
  "riskLevel": "low",
  "next_step": "auto_processed"
}
```

## Node-overzicht

| Node | Type | Functie |
|------|------|---------|
| Webhook | webhook | Ontvangt POST op `/webhook/wmo-intake` |
| Valideer | httpRequest | Roept `POST /applications/validate` aan |
| Is valide | if | Vertakt op `valid === true` |
| Fout validatie | respondToWebhook | Geeft HTTP 400 terug bij validatiefouten |
| Orkestreer | httpRequest | Roept `POST /applications` aan (pseudonimisering, AI, fairness, routing, audit) |
| Check backend fout | if | Detecteert backend-fouten via `applicationId` aanwezigheid |
| Fout backend | respondToWebhook | Geeft HTTP 500 terug bij backendfouten |
| Agentic context | set | Voegt `system_message` toe (AVG + EU AI Act instructies voor LLM) |
| Is afgewezen | if | Vertakt op `route === 'rejected'` |
| Zet afgewezen | set | Zet `next_step = "rejected_no_consent"` |
| Bepaal route | if | Vertakt op `route === 'review'` |
| Zet review | set | Zet `next_step = "review_queued"` |
| Zet automatisch | set | Zet `next_step = "auto_processed"` |
| Stuur respons | respondToWebhook | Geeft HTTP 200 terug met resultaat |

## Cloudflare Tunnel (externe toegang)

Voor externe toegang (bijv. webhook testen vanuit internet) kun je `cloudflared` gebruiken. Installeer de Cloudflare Tunnel client en start een tijdelijke tunnel:

```bash
cloudflared tunnel --url http://localhost:5678
```

Dit geeft een publieke URL terug (bijv. `https://xxx.trycloudflare.com`). Vervang `http://localhost:5678` door die URL om de webhook extern bereikbaar te maken. De tunnel is tijdelijk; voor productie gebruik je een vaste Cloudflare-tunnel met een eigen domeinnaam.
