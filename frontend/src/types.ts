export type User = {
  id: number
  name: string
  email: string
  role: 'sme' | 'bank_admin' | 'admin'
  business_profile?: BusinessProfile | null
}

export type BusinessProfile = {
  id: number
  user_id?: number
  business_name: string
  sector?: string
  location?: string
  owner?: string
  credit_health_score?: number
  risk_class?: string
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
