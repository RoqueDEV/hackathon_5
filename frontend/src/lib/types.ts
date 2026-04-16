export type ProvisionType =
  | 'huishoudelijke_hulp'
  | 'rolstoel'
  | 'woningaanpassing'

export type Severity = 'laag' | 'midden' | 'hoog'

export type Route = 'auto' | 'review' | 'rejected'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface ApplicationIn {
  citizenId: string
  name: string
  address: string
  dateOfBirth: string // YYYY-MM-DD
  consentForAI: boolean
  provisionType: ProvisionType
  problemSummary: string
  severity: Severity
  householdContext: Record<string, unknown>
  mobilityIssues: boolean
  multipleProblems: boolean
  submittedAt: string // ISO8601
}

export interface AIRecommendation {
  recommendation: string
  reasoning: string
  confidence: number
  risk_level: RiskLevel
  model: string
}

export interface ApplicationResult {
  applicationId: string
  citizenToken: string
  route: Route
  citizenMessage: string
  aiRecommendation: AIRecommendation | null
  fairnessFlags: string[]
  riskLevel: RiskLevel
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ReviewItem {
  id: string
  applicationId: string
  citizenToken: string
  provisionType: ProvisionType
  severity: Severity
  riskLevel: RiskLevel
  fairnessFlags: string[]
  status: string
  assignedTo?: string | null
  createdAt: string
  decision?: string | null
  note?: string | null
  decidedAt?: string | null
  problemSummary?: string | null
  aiRecommendation?: string | null
  aiReasoning?: string | null
  confidence?: number | null
  aiModel?: string | null
}

export interface AuditRecord {
  id: string
  applicationId: string
  citizenToken: string
  provisionType: ProvisionType
  severity: Severity
  route: Route
  riskLevel: RiskLevel
  confidence?: number | null
  fairnessFlags: string[]
  finalDecisionStatus: string
  processingPurpose: string
  retentionUntil: string
  createdAt: string
  problemSummary?: string | null
  aiRecommendation?: string | null
  aiReasoning?: string | null
  aiModel?: string | null
}

export interface AuditFilters {
  provision?: ProvisionType | ''
  route?: Route | ''
  risk?: RiskLevel | ''
  flag?: 'has' | 'none' | ''
}

export interface DecisionPayload {
  decision: string
  note?: string
}
