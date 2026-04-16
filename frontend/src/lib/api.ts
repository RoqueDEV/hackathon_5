import type {
  ApplicationIn,
  ApplicationResult,
  ReviewItem,
  AuditRecord,
  AuditFilters,
  DecisionPayload,
} from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL ?? 'http://localhost:5678/webhook/wmo-intake'

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch {
      errorBody = { detail: response.statusText }
    }
    const message =
      typeof errorBody === 'object' &&
      errorBody !== null &&
      'detail' in errorBody
        ? String((errorBody as Record<string, unknown>).detail)
        : `HTTP ${response.status}`
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

async function submitViaWebhook(input: ApplicationIn): Promise<ApplicationResult> {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch {
      errorBody = { error: response.statusText }
    }
    if (typeof errorBody === 'object' && errorBody !== null) {
      const obj = errorBody as Record<string, unknown>
      // n8n validation error: {error, errors, message}
      const msg =
        (typeof obj.message === 'string' && obj.message) ||
        (Array.isArray(obj.errors) && (obj.errors as string[]).join('; ')) ||
        (typeof obj.error === 'string' && obj.error) ||
        `HTTP ${response.status}`
      throw new Error(msg)
    }
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json() as Promise<ApplicationResult>
}

export const apiClient = {
  submitApplication(input: ApplicationIn): Promise<ApplicationResult> {
    return submitViaWebhook(input)
  },

  getReviewQueue(status?: string): Promise<ReviewItem[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return request<ReviewItem[]>('GET', `/review/queue${qs}`)
  },

  decideReview(
    id: string,
    decision: string,
    note?: string,
  ): Promise<ReviewItem> {
    const payload: DecisionPayload = { decision }
    if (note !== undefined && note.trim() !== '') {
      payload.note = note
    }
    return request<ReviewItem>('POST', `/review/${encodeURIComponent(id)}/decision`, payload)
  },

  getAudit(filters?: AuditFilters): Promise<AuditRecord[]> {
    const params = new URLSearchParams()
    if (filters?.provision) params.set('provision', filters.provision)
    if (filters?.route) params.set('route', filters.route)
    if (filters?.risk) params.set('risk', filters.risk)
    if (filters?.flag) params.set('flag', filters.flag)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<AuditRecord[]>('GET', `/audit${qs}`)
  },

  getAuditById(id: string): Promise<AuditRecord> {
    return request<AuditRecord>('GET', `/audit/${encodeURIComponent(id)}`)
  },

  getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>('GET', '/health')
  },
}
