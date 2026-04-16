import { Badge } from '@/components/ui/badge'
import type { Route, RiskLevel, Severity } from '@/lib/types'
import type { BadgeProps } from '@/components/ui/badge'

type BadgeEntry = { label: string; variant: BadgeProps['variant'] }

function safeLookup<K extends string>(
  map: Record<K, BadgeEntry>,
  key: K | string | undefined | null,
): BadgeEntry {
  if (key && key in map) return map[key as K]
  return { label: key ? String(key) : '—', variant: 'default' }
}

interface RouteBadgeProps {
  route?: Route | string | null
}

export function RouteBadge({ route }: RouteBadgeProps) {
  const map: Record<Route, BadgeEntry> = {
    auto: { label: 'Automatisch', variant: 'success' },
    review: { label: 'Ter beoordeling', variant: 'warning' },
    rejected: { label: 'Afgewezen', variant: 'destructive' },
  }
  const { label, variant } = safeLookup(map, route)
  return <Badge variant={variant}>{label}</Badge>
}

interface RiskBadgeProps {
  risk?: RiskLevel | string | null
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const map: Record<RiskLevel, BadgeEntry> = {
    low: { label: 'Laag risico', variant: 'success' },
    medium: { label: 'Middel risico', variant: 'warning' },
    high: { label: 'Hoog risico', variant: 'destructive' },
  }
  const { label, variant } = safeLookup(map, risk)
  return <Badge variant={variant}>{label}</Badge>
}

interface SeverityBadgeProps {
  severity?: Severity | string | null
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const map: Record<Severity, BadgeEntry> = {
    laag: { label: 'Laag', variant: 'success' },
    midden: { label: 'Midden', variant: 'warning' },
    hoog: { label: 'Hoog', variant: 'destructive' },
  }
  const { label, variant } = safeLookup(map, severity)
  return <Badge variant={variant}>{label}</Badge>
}

interface StatusBadgeProps {
  status?: string | null
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, BadgeEntry> = {
    pending: { label: 'In behandeling', variant: 'warning' },
    approved: { label: 'Goedgekeurd', variant: 'success' },
    rejected: { label: 'Afgewezen', variant: 'destructive' },
    more_info: { label: 'Meer info gevraagd', variant: 'accent' },
    auto_approved: { label: 'Automatisch goedgekeurd', variant: 'success' },
    pending_review: { label: 'In beoordeling', variant: 'warning' },
    rejected_no_consent: { label: 'Geen toestemming', variant: 'destructive' },
  }
  const entry = status && status in map
    ? map[status]
    : { label: status ?? '—', variant: 'default' as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
