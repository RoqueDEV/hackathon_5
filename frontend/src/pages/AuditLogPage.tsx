import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { RouteBadge, RiskBadge, SeverityBadge, StatusBadge } from '@/components/StatusBadge'
import { apiClient } from '@/lib/api'
import type { AuditRecord, AuditFilters, ProvisionType, Route, RiskLevel } from '@/lib/types'
import { formatDate, shortId } from '@/lib/utils'
import { RefreshCw, AlertCircle, Filter } from 'lucide-react'

const provisionLabels: Record<string, string> = {
  huishoudelijke_hulp: 'Huishoudelijke hulp',
  rolstoel: 'Rolstoel',
  woningaanpassing: 'Woningaanpassing',
}

export function AuditLogPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [filters, setFilters] = useState<AuditFilters>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AuditRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getAudit(filters)
      setRecords(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden van het auditlog.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  function openDetail(record: AuditRecord) {
    setSelected(record)
    setDialogOpen(true)
  }

  function updateFilter<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Auditlog"
        description={`${records.length} records`}
        actions={
          <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Vernieuwen
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[--border] bg-[--surface]">
        <Filter size={13} className="text-[--text-muted]" />
        <span className="text-xs text-[--text-muted] font-medium">Filters:</span>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[--text-muted]">Type</label>
          <Select
            value={filters.provision ?? ''}
            onChange={(e) =>
              updateFilter('provision', e.target.value as ProvisionType | '')
            }
            className="h-7 text-xs w-44"
          >
            <option value="">Alle typen</option>
            <option value="huishoudelijke_hulp">Huishoudelijke hulp</option>
            <option value="rolstoel">Rolstoel</option>
            <option value="woningaanpassing">Woningaanpassing</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[--text-muted]">Route</label>
          <Select
            value={filters.route ?? ''}
            onChange={(e) => updateFilter('route', e.target.value as Route | '')}
            className="h-7 text-xs w-36"
          >
            <option value="">Alle routes</option>
            <option value="auto">Automatisch</option>
            <option value="review">Beoordeling</option>
            <option value="rejected">Afgewezen</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[--text-muted]">Risico</label>
          <Select
            value={filters.risk ?? ''}
            onChange={(e) => updateFilter('risk', e.target.value as RiskLevel | '')}
            className="h-7 text-xs w-32"
          >
            <option value="">Alle niveaus</option>
            <option value="low">Laag</option>
            <option value="medium">Middel</option>
            <option value="high">Hoog</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[--text-muted]">Signalen</label>
          <Select
            value={filters.flag ?? ''}
            onChange={(e) =>
              updateFilter('flag', e.target.value as 'has' | 'none' | '')
            }
            className="h-7 text-xs w-36"
          >
            <option value="">Alle</option>
            <option value="has">Met signalen</option>
            <option value="none">Zonder signalen</option>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({})}
          className="ml-auto"
        >
          Wis filters
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 flex items-start gap-2 rounded border border-[--destructive]/30 bg-[--destructive-subtle] p-3">
            <AlertCircle size={15} className="text-[--destructive] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[--destructive]">{error}</p>
          </div>
        )}

        {loading && !error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[--text-muted]">Laden...</p>
          </div>
        ) : records.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[--text-muted]">Geen auditrecords gevonden.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ernst</TableHead>
                <TableHead>Risico</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signalen</TableHead>
                <TableHead>Aangemaakt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow
                  key={record.id ?? record.applicationId}
                  onClick={() => openDetail(record)}
                >
                  <TableCell>
                    <span className="font-mono text-xs text-[--text-secondary]">
                      {shortId(record.applicationId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {provisionLabels[record.provisionType] ?? record.provisionType}
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={record.severity} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge risk={record.riskLevel} />
                  </TableCell>
                  <TableCell>
                    <RouteBadge route={record.route} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.finalDecisionStatus} />
                  </TableCell>
                  <TableCell>
                    {record.fairnessFlags.length > 0 ? (
                      <Badge variant="warning">{record.fairnessFlags.length} signaal</Badge>
                    ) : (
                      <span className="text-xs text-[--text-muted]">Geen</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-[--text-muted]">
                      {formatDate(record.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selected ? `Auditrecord — ${shortId(selected.applicationId)}` : ''}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Route</p>
                <RouteBadge route={selected.route} />
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Status</p>
                <StatusBadge status={selected.finalDecisionStatus} />
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Risico</p>
                <RiskBadge risk={selected.riskLevel} />
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Ernst</p>
                <SeverityBadge severity={selected.severity} />
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Type</p>
                <p className="text-sm text-[--text]">
                  {provisionLabels[selected.provisionType] ?? selected.provisionType}
                </p>
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Aangemaakt</p>
                <p className="text-sm text-[--text]">{formatDate(selected.createdAt)}</p>
              </div>
              {typeof selected.confidence === 'number' && (
                <div>
                  <p className="text-xs text-[--text-muted] mb-1">AI-betrouwbaarheid</p>
                  <p className="text-sm text-[--text]">
                    {Math.round((selected.confidence ?? 0) * 100)}%
                  </p>
                </div>
              )}
            </div>

            {selected.problemSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Aanvraag van de burger</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[--text] leading-relaxed">
                    {selected.problemSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            {selected.aiRecommendation && (
              <Card>
                <CardHeader>
                  <CardTitle>AI-advies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-[--text-muted] mb-0.5">Aanbeveling</p>
                    <p className="text-sm text-[--text]">{selected.aiRecommendation}</p>
                  </div>
                  {selected.aiReasoning && (
                    <div>
                      <p className="text-xs text-[--text-muted] mb-0.5">Onderbouwing</p>
                      <p className="text-sm text-[--text]">{selected.aiReasoning}</p>
                    </div>
                  )}
                  {typeof selected.confidence === 'number' && (
                    <div>
                      <p className="text-xs text-[--text-muted] mb-0.5">Betrouwbaarheid</p>
                      <p className="text-sm text-[--text]">
                        {Math.round((selected.confidence ?? 0) * 100)}%
                      </p>
                    </div>
                  )}
                  {selected.aiModel && (
                    <div>
                      <p className="text-xs text-[--text-muted] mb-0.5">Model</p>
                      <p className="text-sm font-mono text-[--text-secondary]">
                        {selected.aiModel}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-[--text-muted] pt-1 border-t border-[--border]">
                    Dit advies is gegenereerd door AI en dient ter ondersteuning. U beslist.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Privacy en bewaren</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-[--text-muted]">
                  Verwerkingsdoel: <span className="text-[--text]">{selected.processingPurpose}</span>
                </p>
                <p className="text-xs text-[--text-muted]">
                  Bewaartermijn tot:{' '}
                  <span className="text-[--text]">{formatDate(selected.retentionUntil)}</span>
                </p>
                <p className="font-mono text-xs text-[--text-secondary] break-all mt-1">
                  {selected.citizenToken}
                </p>
              </CardContent>
            </Card>

            {selected.fairnessFlags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Fairness-signalen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {selected.fairnessFlags.map((flag) => (
                      <Badge key={flag} variant="warning">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </Dialog>
    </div>
  )
}
