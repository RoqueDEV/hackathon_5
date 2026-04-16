import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RiskBadge, SeverityBadge, StatusBadge } from '@/components/StatusBadge'
import { apiClient } from '@/lib/api'
import type { ReviewItem } from '@/lib/types'
import { formatDate, shortId } from '@/lib/utils'
import { RefreshCw, AlertCircle } from 'lucide-react'

const provisionLabels: Record<string, string> = {
  huishoudelijke_hulp: 'Huish. hulp',
  rolstoel: 'Rolstoel',
  woningaanpassing: 'Woningaanpassing',
}

export function ReviewerDashboardPage() {
  const [queue, setQueue] = useState<ReviewItem[]>([])
  const [selected, setSelected] = useState<ReviewItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [decideError, setDecideError] = useState<string | null>(null)
  const [decideSuccess, setDecideSuccess] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getReviewQueue('pending')
      setQueue(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden van de wachtrij.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  function selectRow(item: ReviewItem) {
    setSelected(item)
    setNote('')
    setDecideError(null)
    setDecideSuccess(null)
  }

  async function handleDecide(decision: string) {
    if (!selected) return
    setDeciding(true)
    setDecideError(null)
    setDecideSuccess(null)
    try {
      const updated = await apiClient.decideReview(selected.applicationId, decision, note)
      setDecideSuccess(`Beslissing geregistreerd: ${decision}`)
      setSelected(updated)
      // Refresh queue
      await loadQueue()
    } catch (e) {
      setDecideError(e instanceof Error ? e.message : 'Fout bij verwerken beslissing.')
    } finally {
      setDeciding(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Beoordelingswachtrij"
        description={queue.length > 0 ? `${queue.length} openstaand` : undefined}
        actions={
          <Button variant="ghost" size="sm" onClick={loadQueue} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Vernieuwen
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* Table */}
        <div className="flex-1 overflow-auto border-r border-[--border]">
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
          ) : queue.length === 0 && !loading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[--text-muted]">Geen openstaande aanvragen.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ernst</TableHead>
                  <TableHead>Risico</TableHead>
                  <TableHead>Signalen</TableHead>
                  <TableHead>Aangemaakt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow
                    key={item.applicationId}
                    onClick={() => selectRow(item)}
                    className={
                      selected?.applicationId === item.applicationId
                        ? 'bg-[--accent-subtle]'
                        : ''
                    }
                  >
                    <TableCell>
                      <span className="font-mono text-xs text-[--text-secondary]">
                        {shortId(item.applicationId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {provisionLabels[item.provisionType] ?? item.provisionType}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={item.severity} />
                    </TableCell>
                    <TableCell>
                      <RiskBadge risk={item.riskLevel} />
                    </TableCell>
                    <TableCell>
                      {item.fairnessFlags.length > 0 ? (
                        <Badge variant="warning">{item.fairnessFlags.length} signaal</Badge>
                      ) : (
                        <span className="text-xs text-[--text-muted]">Geen</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[--text-muted]">
                        {formatDate(item.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="w-96 flex-shrink-0 overflow-auto p-4 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-[--text] mb-1">
                Aanvraag detail
              </h2>
              <p className="text-xs font-mono text-[--text-muted]">
                {selected.applicationId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Type</p>
                <span className="text-sm text-[--text]">
                  {provisionLabels[selected.provisionType] ?? selected.provisionType}
                </span>
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Risico</p>
                <RiskBadge risk={selected.riskLevel} />
              </div>
              <div>
                <p className="text-xs text-[--text-muted] mb-1">Ernst</p>
                <SeverityBadge severity={selected.severity} />
              </div>
            </div>

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

            <Card>
              <CardHeader>
                <CardTitle>Burger-token</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-xs text-[--text-secondary] break-all">
                  {selected.citizenToken}
                </p>
              </CardContent>
            </Card>

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
                        {Math.round(selected.confidence * 100)}%
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

            {/* Decision actions */}
            {selected.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle>Beslissing nemen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="block text-xs text-[--text-muted] mb-1">
                      Notitie (optioneel)
                    </label>
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Toelichting bij uw beslissing..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="success"
                      onClick={() => handleDecide('approved')}
                      disabled={deciding}
                    >
                      Goedkeuren
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDecide('rejected')}
                      disabled={deciding}
                    >
                      Afwijzen
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleDecide('more_info')}
                      disabled={deciding}
                    >
                      Meer informatie vragen
                    </Button>
                  </div>
                  {decideError && (
                    <p className="text-xs text-[--destructive]">{decideError}</p>
                  )}
                  {decideSuccess && (
                    <p className="text-xs text-[--success]">{decideSuccess}</p>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        ) : (
          <div className="w-96 flex-shrink-0 flex items-center justify-center p-8">
            <p className="text-sm text-[--text-muted] text-center">
              Selecteer een aanvraag uit de lijst om details te bekijken.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
