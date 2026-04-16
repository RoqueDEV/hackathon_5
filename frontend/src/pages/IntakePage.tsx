import { useState } from 'react'
import { PageHeader } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api'
import type { ApplicationIn, ApplicationResult, ProvisionType, Severity } from '@/lib/types'
import { CheckCircle2, Info, Home, Sparkles, Wrench, AlertCircle } from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Format first 8 hex chars of a UUID as XXXX-XXXX in uppercase */
function formatReference(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

// ─── form state ─────────────────────────────────────────────────────────────

interface FormState {
  name: string
  dateOfBirth: string
  address: string
  citizenId: string
  provisionType: ProvisionType
  problemSummary: string
  severity: Severity
  mobilityIssues: boolean
  multipleProblems: boolean
  householdPersons: number
  consentForAI: boolean
}

const emptyForm: FormState = {
  name: '',
  dateOfBirth: '',
  address: '',
  citizenId: '',
  provisionType: 'huishoudelijke_hulp',
  problemSummary: '',
  severity: 'laag',
  mobilityIssues: false,
  multipleProblems: false,
  householdPersons: 1,
  consentForAI: true,
}

// ─── presets ────────────────────────────────────────────────────────────────

const presets: Record<string, FormState> = {
  tc1: {
    name: 'Anna de Vries',
    dateOfBirth: '1955-03-12',
    address: 'Hoofdstraat 1, Amsterdam',
    citizenId: 'TC001',
    provisionType: 'huishoudelijke_hulp',
    problemSummary: 'Ik heb moeite met schoonmaken door rugklachten.',
    severity: 'laag',
    mobilityIssues: false,
    multipleProblems: false,
    householdPersons: 1,
    consentForAI: true,
  },
  tc2: {
    name: 'Bert Janssen',
    dateOfBirth: '1948-07-22',
    address: 'Keizersgracht 45, Utrecht',
    citizenId: 'TC002',
    provisionType: 'rolstoel',
    problemSummary: 'Ik kan niet meer zelfstandig lopen na mijn operatie en heb meerdere aandoeningen.',
    severity: 'hoog',
    mobilityIssues: true,
    multipleProblems: true,
    householdPersons: 2,
    consentForAI: true,
  },
  tc3: {
    name: 'Fatima El Amrani',
    dateOfBirth: '1972-11-05',
    address: 'Nieuwstraat 12, Rotterdam',
    citizenId: 'TC003',
    provisionType: 'woningaanpassing',
    problemSummary: 'Door mijn religie en culturele achtergrond heb ik specifieke aanpassingen nodig in de badkamer.',
    severity: 'midden',
    mobilityIssues: true,
    multipleProblems: false,
    householdPersons: 4,
    consentForAI: true,
  },
  tc4: {
    name: 'Kees Bakker',
    dateOfBirth: '1960-01-30',
    address: 'Dorpsweg 3, Groningen',
    citizenId: 'TC004',
    provisionType: 'huishoudelijke_hulp',
    problemSummary: 'Ik heb hulp nodig bij het huishouden.',
    severity: 'laag',
    mobilityIssues: false,
    multipleProblems: false,
    householdPersons: 1,
    consentForAI: false,
  },
}

const presetLabels = [
  { key: 'tc1', label: 'Testcase 1', description: 'Laag risico' },
  { key: 'tc2', label: 'Testcase 2', description: 'Hoog risico' },
  { key: 'tc3', label: 'Testcase 3', description: 'Fairness-signaal' },
  { key: 'tc4', label: 'Testcase 4', description: 'Geen toestemming' },
]

// ─── provision options ───────────────────────────────────────────────────────

const provisionOptions: Array<{
  value: ProvisionType
  label: string
  description: string
  Icon: React.FC<{ size?: number; className?: string }>
}> = [
  {
    value: 'huishoudelijke_hulp',
    label: 'Huishoudelijke hulp',
    description: 'Hulp bij schoonmaken, koken of andere huishoudelijke taken',
    Icon: Sparkles,
  },
  {
    value: 'rolstoel',
    label: 'Rolstoel',
    description: 'Een rolstoel of ander hulpmiddel voor vervoer',
    Icon: Wrench,
  },
  {
    value: 'woningaanpassing',
    label: 'Woningaanpassing',
    description: 'Aanpassingen aan uw woning, zoals een traplift of drempelhulp',
    Icon: Home,
  },
]

// ─── urgency options ─────────────────────────────────────────────────────────

const urgencyOptions: Array<{ value: Severity; label: string }> = [
  { value: 'laag', label: 'Niet urgent' },
  { value: 'midden', label: 'Enigszins urgent' },
  { value: 'hoog', label: 'Zeer urgent, ik kan niet langer wachten' },
]

// ─── component ───────────────────────────────────────────────────────────────

export function IntakePage() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplicationResult | null>(null)
  // When consent is rejected the backend throws HTTP 400; we capture that here
  const [consentRejected, setConsentRejected] = useState(false)

  function resetForm() {
    setForm(emptyForm)
    setError(null)
    setResult(null)
    setConsentRejected(false)
  }

  function applyPreset(key: string) {
    const preset = presets[key]
    if (preset) {
      setForm(preset)
      setError(null)
      setResult(null)
      setConsentRejected(false)
    }
  }

  function buildPayload(f: FormState): ApplicationIn {
    return {
      citizenId: f.citizenId,
      name: f.name,
      address: f.address,
      dateOfBirth: f.dateOfBirth,
      consentForAI: f.consentForAI,
      provisionType: f.provisionType,
      problemSummary: f.problemSummary,
      severity: f.severity,
      householdContext: { personen: f.householdPersons },
      mobilityIssues: f.mobilityIssues,
      multipleProblems: f.multipleProblems,
      submittedAt: new Date().toISOString(),
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setResult(null)
    setConsentRejected(false)
    try {
      const payload = buildPayload(form)
      const res = await apiClient.submitApplication(payload)
      setResult(res)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Er is een fout opgetreden.'
      // The backend returns detail as a JSON object for consent errors, which api.ts
      // stringifies as "[object Object]". Detect this plus explicit keyword matches.
      if (
        msg === '[object Object]' ||
        msg.toLowerCase().includes('consent') ||
        msg.toLowerCase().includes('toestemming')
      ) {
        setConsentRejected(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── success / consent-rejected screen ──────────────────────────────────────
  if (result || consentRejected) {
    const routeText = consentRejected
      ? 'Uw aanvraag kon niet worden verwerkt omdat u geen toestemming heeft gegeven voor AI-ondersteuning. U kunt op een later moment opnieuw een aanvraag indienen.'
      : result?.route === 'auto'
        ? 'Uw aanvraag wordt automatisch verwerkt. U ontvangt binnen 5 werkdagen een officieel besluit per post of e-mail van de gemeente.'
        : result?.route === 'review'
          ? 'Een medewerker van de gemeente kijkt nog persoonlijk naar uw aanvraag. Dit duurt doorgaans 5 tot 10 werkdagen. U hoort zo snel mogelijk meer van ons.'
          : 'Uw aanvraag kon niet worden verwerkt omdat u geen toestemming heeft gegeven voor AI-ondersteuning. U kunt op een later moment opnieuw een aanvraag indienen.'

    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Hulp aanvragen"
          description="Vraag ondersteuning aan bij uw gemeente"
        />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Success icon + heading */}
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <CheckCircle2 size={48} className="text-[--success]" />
              <h2 className="text-xl font-semibold text-[--text]">Uw aanvraag is ontvangen</h2>
              <p className="text-sm text-[--text-muted]">
                Hartelijk dank. We hebben uw aanvraag goed ontvangen.
              </p>
            </div>

            {/* Reference number */}
            {result && (
              <div className="rounded border border-[--border] bg-[--surface] p-5 text-center space-y-2">
                <p className="text-xs text-[--text-muted] uppercase tracking-wide">Uw referentienummer</p>
                <p className="text-2xl font-mono font-bold text-[--text]">
                  {formatReference(result.applicationId)}
                </p>
                <p className="text-xs text-[--text-muted]">
                  Bewaar dit nummer. U kunt hiermee uw aanvraag later terugvinden.
                </p>
              </div>
            )}

            {/* What happens next */}
            <Card>
              <CardHeader>
                <CardTitle>Wat gebeurt er nu?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[--text-secondary] leading-relaxed">{routeText}</p>
              </CardContent>
            </Card>

            {/* AI transparency (EU AI Act) */}
            <div className="flex items-start gap-3 rounded border border-[--border] bg-[--surface] p-4">
              <Info size={16} className="text-[--text-muted] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[--text-muted] leading-relaxed">
                Bij de voorbereiding van uw aanvraag is AI-software gebruikt. Een medewerker van de gemeente beslist altijd over complexe of gevoelige aanvragen. U kunt altijd contact opnemen als u vragen heeft.
              </p>
            </div>

            {/* Citizen message */}
            {result?.citizenMessage && (
              <Card>
                <CardHeader>
                  <CardTitle>Bericht van de gemeente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[--text-secondary] leading-relaxed">
                    {result.citizenMessage}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button variant="secondary" className="w-full" onClick={resetForm}>
              Nieuwe aanvraag indienen
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── form screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Hulp aanvragen"
        description="Vraag ondersteuning aan bij uw gemeente"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Intro */}
          <p className="text-sm text-[--text-muted] leading-relaxed">
            De Wet maatschappelijke ondersteuning (WMO) helpt mensen die moeite hebben met zelfstandig wonen of deelnemen aan de samenleving. Via dit formulier vraagt u hulp aan bij uw gemeente. AI helpt ons uw aanvraag voor te bereiden, maar een medewerker van de gemeente neemt altijd de uiteindelijke beslissing.
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded border border-[--destructive]/30 bg-[--destructive-subtle] p-3">
              <AlertCircle size={15} className="text-[--destructive] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[--destructive]">{error}</p>
            </div>
          )}

          {/* Card: Over u */}
          <Card>
            <CardHeader>
              <CardTitle>Over u</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs text-[--text-muted] mb-1">
                  Voor- en achternaam <span className="text-[--destructive]">*</span>
                </label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Uw volledige naam"
                  required
                />
              </div>
              <div>
                <label htmlFor="dob" className="block text-xs text-[--text-muted] mb-1">
                  Geboortedatum <span className="text-[--destructive]">*</span>
                </label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-xs text-[--text-muted] mb-1">
                  Adres <span className="text-[--destructive]">*</span>
                </label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Straatnaam huisnummer, Stad"
                  required
                />
              </div>
              <div>
                <label htmlFor="bsn" className="block text-xs text-[--text-muted] mb-1">
                  Burgerservicenummer (BSN) <span className="text-[--destructive]">*</span>
                </label>
                <Input
                  id="bsn"
                  value={form.citizenId}
                  onChange={(e) => setForm((p) => ({ ...p, citizenId: e.target.value }))}
                  placeholder="123456789"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: Waar heeft u hulp bij nodig? */}
          <Card>
            <CardHeader>
              <CardTitle>Waar heeft u hulp bij nodig?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" role="radiogroup" aria-label="Type hulp">
                {provisionOptions.map(({ value, label, description, Icon }) => {
                  const checked = form.provisionType === value
                  return (
                    <label
                      key={value}
                      htmlFor={`provision-${value}`}
                      className={`flex items-start gap-3 rounded border p-4 cursor-pointer transition-colors ${
                        checked
                          ? 'border-[--accent] bg-[--accent-subtle]'
                          : 'border-[--border] bg-[--surface] hover:bg-[--surface-hover]'
                      }`}
                    >
                      <input
                        id={`provision-${value}`}
                        type="radio"
                        name="provisionType"
                        value={value}
                        checked={checked}
                        onChange={() => setForm((p) => ({ ...p, provisionType: value }))}
                        className="mt-0.5 accent-[--accent]"
                      />
                      <Icon size={18} className={checked ? 'text-[--accent]' : 'text-[--text-muted]'} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${checked ? 'text-[--accent]' : 'text-[--text]'}`}>
                          {label}
                        </p>
                        <p className="text-xs text-[--text-muted] mt-0.5">{description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Card: Uw situatie */}
          <Card>
            <CardHeader>
              <CardTitle>Uw situatie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label htmlFor="problem" className="block text-xs text-[--text-muted] mb-1">
                  Leg uit waar u hulp bij nodig heeft <span className="text-[--destructive]">*</span>
                </label>
                <Textarea
                  id="problem"
                  rows={5}
                  value={form.problemSummary}
                  onChange={(e) => setForm((p) => ({ ...p, problemSummary: e.target.value }))}
                  placeholder="Bijvoorbeeld: Ik kan sinds mijn operatie niet meer goed lopen en heb hulp nodig bij het schoonmaken."
                  required
                />
              </div>

              <div>
                <p className="text-xs text-[--text-muted] mb-3">
                  Hoe urgent is uw situatie?
                </p>
                <div className="space-y-2" role="radiogroup" aria-label="Urgentie">
                  {urgencyOptions.map(({ value, label }) => {
                    const checked = form.severity === value
                    return (
                      <label
                        key={value}
                        htmlFor={`severity-${value}`}
                        className={`flex items-center gap-3 rounded border p-3 cursor-pointer transition-colors ${
                          checked
                            ? 'border-[--accent] bg-[--accent-subtle]'
                            : 'border-[--border] bg-[--surface] hover:bg-[--surface-hover]'
                        }`}
                      >
                        <input
                          id={`severity-${value}`}
                          type="radio"
                          name="severity"
                          value={value}
                          checked={checked}
                          onChange={() => setForm((p) => ({ ...p, severity: value }))}
                          className="accent-[--accent]"
                        />
                        <span className={`text-sm ${checked ? 'text-[--accent] font-medium' : 'text-[--text]'}`}>
                          {label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="mobility"
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    id="mobility"
                    type="checkbox"
                    checked={form.mobilityIssues}
                    onChange={(e) => setForm((p) => ({ ...p, mobilityIssues: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-[--border] accent-[--accent]"
                  />
                  <span className="text-sm text-[--text-secondary]">
                    Ik heb moeite met lopen of verplaatsen
                  </span>
                </label>
                <label
                  htmlFor="multiple"
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    id="multiple"
                    type="checkbox"
                    checked={form.multipleProblems}
                    onChange={(e) => setForm((p) => ({ ...p, multipleProblems: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-[--border] accent-[--accent]"
                  />
                  <span className="text-sm text-[--text-secondary]">
                    Ik heb meerdere gezondheidsproblemen tegelijk
                  </span>
                </label>
              </div>

              <div>
                <label htmlFor="persons" className="block text-xs text-[--text-muted] mb-1">
                  Uit hoeveel personen bestaat uw huishouden?
                </label>
                <Input
                  id="persons"
                  type="number"
                  min={1}
                  value={form.householdPersons}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, householdPersons: Math.max(1, parseInt(e.target.value) || 1) }))
                  }
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: Toestemming */}
          <Card>
            <CardHeader>
              <CardTitle>Toestemming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="consent" className="flex items-start gap-3 cursor-pointer">
                <input
                  id="consent"
                  type="checkbox"
                  checked={form.consentForAI}
                  onChange={(e) => setForm((p) => ({ ...p, consentForAI: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-[--border] accent-[--accent]"
                />
                <span className="text-sm text-[--text-secondary] leading-relaxed">
                  Ik geef toestemming dat AI helpt bij het voorbereiden van mijn aanvraag. Een medewerker van de gemeente neemt altijd de uiteindelijke beslissing bij complexe zaken.
                </span>
              </label>
              <p className="text-xs text-[--text-muted] leading-relaxed pl-7">
                Uw gegevens worden veilig verwerkt. We gebruiken nooit uw naam of adres voor AI-analyse — alleen een anoniem nummer.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Aanvraag wordt verstuurd...' : 'Aanvraag versturen'}
          </Button>

          {/* Dev helper — subtle, native details element */}
          <details className="mt-4">
            <summary className="text-xs text-[--text-muted] cursor-pointer select-none hover:text-[--text-secondary] transition-colors">
              Voorbeelden (voor testen)
            </summary>
            <div className="mt-2 flex flex-wrap gap-2 pl-1">
              {presetLabels.map(({ key, label, description }) => (
                <Button
                  key={key}
                  variant="secondary"
                  size="sm"
                  onClick={() => applyPreset(key)}
                  className="text-xs opacity-70 hover:opacity-100"
                >
                  {label}: {description}
                </Button>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
