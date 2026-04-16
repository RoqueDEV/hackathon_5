#!/usr/bin/env bash
# WMO Zorgagent — Testcases
# Voert 4 curl-aanroepen uit tegen de n8n-webhook en toont de resultaten.
# Gebruik: bash scripts/test-cases.sh
# Vereist: curl (altijd aanwezig), jq (optioneel, voor pretty-print)

set -euo pipefail

WEBHOOK_URL="http://localhost:5678/webhook/wmo-intake"
AUDIT_URL="http://localhost:8000/audit"

# Pretty-print helper: gebruik jq als beschikbaar, anders cat
pretty() {
  if command -v jq &>/dev/null; then
    jq .
  else
    cat
  fi
}

echo "========================================"
echo "  WMO Zorgagent — Integratietestcases"
echo "========================================"
echo ""

# --- Testcase 1: Laag risico ---
echo "--- Testcase 1: Laag risico (rolstoel, automatische route verwacht) ---"
curl -s -X POST "${WEBHOOK_URL}" \
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
  }' | pretty
echo ""

# --- Testcase 2: Hoog risico ---
echo "--- Testcase 2: Hoog risico (huishoudelijke hulp, review verwacht) ---"
curl -s -X POST "${WEBHOOK_URL}" \
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
  }' | pretty
echo ""

# --- Testcase 3: Fairness flag ---
echo "--- Testcase 3: Fairness flag (woningaanpassing, verboden term verwacht) ---"
curl -s -X POST "${WEBHOOK_URL}" \
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
  }' | pretty
echo ""

# --- Testcase 4: Geen toestemming ---
echo "--- Testcase 4: Geen toestemming (consentForAI=false, foutmelding verwacht) ---"
curl -s -w "\nHTTP_STATUS: %{http_code}\n" -X POST "${WEBHOOK_URL}" \
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
  }' | pretty
echo ""

echo "========================================"
echo "  Alle testcases voltooid."
echo "========================================"
echo ""
echo "Controleer audit logs: curl ${AUDIT_URL} | jq"
