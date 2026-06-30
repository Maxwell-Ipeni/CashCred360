export type TenantSettings = {
  display_name?: string | null
  logo_path?: string | null
  favicon_path?: string | null
  background_image_path?: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  theme_mode: 'light' | 'dark'
  enabled_features: string[]
  enabled_widgets: string[]
  widget_order: string[]
}

export type Tenant = {
  id: number
  name: string
  slug: string
  status: string
  settings?: TenantSettings | null
  branches?: Branch[]
}

export type Branch = { id: number; tenant_id: number; name: string; code?: string | null; location?: string | null; status: string }
export type Role = { id: number; tenant_id: number; name: string; slug: string; permissions?: { key: string; name: string; group?: string }[] }
export type TenantMembership = { id?: number; tenant_id: number; branch_id?: number | null; status: string; tenant?: Tenant; branch?: Branch | null; role?: Role | null; user?: User }

export type User = {
  id: number
  name: string
  email: string
  role: 'sme' | 'bank_admin' | 'admin' | 'super_admin'
  business_profile?: BusinessProfile | null
  permissions?: string[]
  active_tenant?: Tenant | null
  active_branch?: Branch | null
  memberships?: TenantMembership[]
}

export type BusinessProfile = {
  id: number
  tenant_id?: number
  branch_id?: number
  user_id?: number
  business_name: string
  sector?: string
  location?: string
  owner?: string
  credit_health_score?: number
  risk_class?: string
  tenant?: Tenant | null
}

export type SummaryDelta = {
  value: number
  label: string
  direction: 'up' | 'down' | 'flat'
}

export type Summary = {
  business?: BusinessProfile
  total_income: number
  total_expenses: number
  net_profit: number
  cashflow_balance: number
  outstanding_loans: number
  credit_health_score: number
  risk_class: string
  unread_alerts: number
  open_receivables: number
  deltas?: Partial<Record<'cashflow_balance' | 'total_income' | 'total_expenses' | 'net_profit' | 'credit_health_score', SummaryDelta>>
}

export type TrendPoint = { month: string; income: number; expenses: number; net_cashflow: number }
export type BreakdownPoint = { category: string; value: number }
export type LoanProgress = { name: string; lender: string; outstanding_balance: number; repayment_progress: number; status: string }

export type Transaction = {
  id: number
  type: 'income' | 'expense'
  category: string
  description?: string
  amount: number
  transaction_date: string
  status: 'pending' | 'cleared'
}

export type Invoice = {
  id: number
  invoice_number: string
  customer_name: string
  amount: number
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
}

export type Loan = {
  id: number
  lender: string
  product_name?: string
  principal_amount: number
  outstanding_balance: number
  monthly_installment: number
  next_due_date?: string
  repayment_progress: number
  status: 'current' | 'late' | 'restructured' | 'closed'
}

export type Alert = { id: number; type: string; severity: string; title: string; message: string; is_read: boolean }
export type Recommendation = { id: number; category: string; priority: string; title: string; description: string; is_completed: boolean }

export type CreditHealth = {
  score: number
  risk_class: string
  factors: Record<string, number>
  summary: Record<string, number>
  recommendations: { title: string; description: string }[]
}
