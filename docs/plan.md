# Plan — WMO Zorgagent Prototype

## Fases

1. **Parallel subagent dispatch** — 4 Sonnet subagents in eigen subdirs.
2. **Integratie** — root files check, consistentie.
3. **Verificatie** — `docker compose up --build` + 4 testcases.

## Interface contract (VAST, wijzig niet per subagent)

### Ports
- frontend: **5173**
- backend: **8000**
- postgres: **5432**
- n8n: **5678**

### Service names (docker-compose)
- `frontend`, `backend`, `postgres`, `n8n`

### Database
- DB naam: `wmo`
- User: `wmo`
- Password: `wmo_local_dev` (alleen lokaal)
- `DATABASE_URL=postgresql+psycopg://wmo:wmo_local_dev@postgres:5432/wmo`
- Image: `pgvector/pgvector:pg16`
- Extensie: `CREATE EXTENSION IF NOT EXISTS vector;`

### Env vars
```
DATABASE_URL=postgresql+psycopg://wmo:wmo_local_dev@postgres:5432/wmo
PSEUDONYM_SECRET=local_dev_secret_change_me
CONFIDENCE_THRESHOLD=0.7
RETENTION_DAYS=90
FAIRNESS_BLOCKLIST_PATH=/app/app/core/fairness_blocklist.yaml
LOG_LEVEL=INFO

N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin_local_dev
N8N_ENCRYPTION_KEY=local_dev_encryption_key_32_chars
N8N_HOST=localhost
N8N_PORT=5678
WEBHOOK_URL=http://localhost:5678/
GENERIC_TIMEZONE=Europe/Amsterdam
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=wmo
DB_POSTGRESDB_USER=wmo
DB_POSTGRESDB_PASSWORD=wmo_local_dev

VITE_API_BASE_URL=http://localhost:8000
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/wmo-intake
```

### Backend endpoints (compleet)

| Method | Path | Body / Params | Returns |
|---|---|---|---|
| POST | `/applications` | `ApplicationIn` | `ApplicationResult` |
| POST | `/applications/validate` | `ApplicationIn` | `{valid: bool, errors: []}` |
| POST | `/pseudonymize` | `{citizenId: str}` | `{token: str}` |
| POST | `/minimize` | `ApplicationIn` | `MinimizedApplication` |
| GET | `/policy/{provisionType}` | path | `PolicyRule` |
| POST | `/ai/recommend` | `MinimizedApplication` | `AIRecommendation` |
| POST | `/fairness/check` | `AIRecommendation` | `FairnessResult` |
| GET | `/review/queue` | `?status=pending` | `ReviewItem[]` |
| POST | `/review/{applicationId}/decision` | `{decision, note}` | `ReviewItem` |
| GET | `/audit` | `?provision=&route=&risk=&flag=` | `AuditRecord[]` |
| GET | `/audit/{applicationId}` | path | `AuditRecord` |
| GET | `/citizen/{token}/data` | path | `CitizenData` |
| GET | `/health` | - | `{status: "ok"}` |

### Schemas

**ApplicationIn** (JSON):
```json
{
  "citizenId": "string",
  "name": "string",
  "address": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "consentForAI": true,
  "provisionType": "huishoudelijke_hulp|rolstoel|woningaanpassing",
  "problemSummary": "string",
  "severity": "laag|midden|hoog",
  "householdContext": {},
  "mobilityIssues": true,
  "multipleProblems": false,
  "submittedAt": "ISO8601"
}
```

**ApplicationResult**:
```json
{
  "applicationId": "uuid",
  "citizenToken": "string",
  "route": "auto|review|rejected",
  "citizenMessage": "string",
  "aiRecommendation": {...} | null,
  "fairnessFlags": ["string"],
  "riskLevel": "low|medium|high"
}
```

**AIRecommendation**:
```json
{
  "recommendation": "string",
  "reasoning": "string",
  "confidence": 0.85,
  "risk_level": "low|medium|high",
  "model": "stub-v1"
}
```

**FairnessResult**:
```json
{
  "passed": true,
  "flags": ["forbidden_term:religie"],
  "severity": "low|medium|high"
}
```

### Routing regels (human-in-the-loop)
Route = `review` als één van:
- `severity == "hoog"`
- `multipleProblems == true`
- `ai.risk_level == "high"`
- `fairness.flags.length > 0`
- `ai.confidence < CONFIDENCE_THRESHOLD`

Anders: `auto`.

Bij `consentForAI == false`: route = `rejected`, geen AI call.

### AI stub-gedrag (deterministisch)
Hash input → kies scenario:
- problemSummary bevat "godsdienst" / "religie" / "ras" → fairness flag (testcase 3)
- severity=="hoog" én multipleProblems==true → risk_level=high, confidence=0.6 (testcase 2)
- anders → risk_level=low, confidence=0.9, recommendation passend bij provision (testcase 1)

### Pseudonimisering
`token = "cit_" + hmac_sha256(PSEUDONYM_SECRET, citizenId)[:16]`

### Leeftijdsgroep
`dateOfBirth` → `ageGroup` ∈ `{<18, 18-25, 26-40, 41-65, 65+}`

## Taakverdeling subagents

- **A Backend** → `/backend/**`
- **B Frontend** → `/frontend/**`
- **C n8n** → `/n8n/**`
- **D Infra** → `/db/**`, `/scripts/**`, `/docs/prompt-charter.md`, root (`docker-compose.yml`, `.env.example`, `README.md`)
