import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileBarChart2,
  FileText,
  Download,
  Eye,
  EyeOff,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  LogOut,
  Mail,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from './lib/api'
import type {
  Alert,
  BreakdownPoint,
  BusinessProfile,
  CreditHealth,
  Invoice,
  Loan,
  LoanProgress,
  Recommendation,
  Summary,
  Transaction,
  TrendPoint,
  User,
} from './types'

const currency = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 })
const chartColors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2']
const incomeCategories = ['Retail sales', 'Corporate supply', 'Service contract', 'Wholesale orders', 'Online sales', 'Other income']
const expenseCategories = ['Inventory', 'Payroll', 'Rent', 'Utilities', 'Transport', 'Marketing', 'Business services', 'Other Expenses']

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return localDate.toISOString().slice(0, 10)
}

function lastTwelveMonthsToTodayFilters() {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1)
  return { date_from: dateInputValue(start), date_to: dateInputValue(end) }
}

const defaultFilters = lastTwelveMonthsToTodayFilters()

function categoriesFor(type: string) {
  return type === 'expense' ? expenseCategories : incomeCategories
}

type ViewKey = 'dashboard' | 'transactions' | 'expenses' | 'invoices' | 'loans' | 'credit' | 'alerts' | 'reports' | 'recommendations'
type DateFilters = typeof defaultFilters

type AppData = {
  businesses: BusinessProfile[]
  summary: Summary | null
  trends: TrendPoint[]
  breakdown: BreakdownPoint[]
  loanProgress: LoanProgress[]
  transactions: Transaction[]
  invoices: Invoice[]
  loans: Loan[]
  alerts: Alert[]
  recommendations: Recommendation[]
  credit: CreditHealth | null
}

const emptyData: AppData = {
  businesses: [],
  summary: null,
  trends: [],
  breakdown: [],
  loanProgress: [],
  transactions: [],
  invoices: [],
  loans: [],
  alerts: [],
  recommendations: [],
  credit: null,
}

const navItems: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transactions', icon: ReceiptText },
  { key: 'expenses', label: 'Expenses', icon: TrendingDown },
  { key: 'invoices', label: 'Invoices & Receivables', icon: FileText },
  { key: 'loans', label: 'Loans & Obligations', icon: CreditCard },
  { key: 'credit', label: 'Credit Health', icon: ShieldCheck },
  { key: 'reports', label: 'Reports', icon: FileBarChart2 },
  { key: 'alerts', label: 'Insights & Alerts', icon: Bell },
  { key: 'recommendations', label: 'Recommendations', icon: Target },
]

const fallbackSummary: Summary = {
  business: { id: 1, business_name: 'ABC Enterprises Ltd', sector: 'SME Account' },
  total_income: 2850000,
  total_expenses: 1605000,
  net_profit: 1245000,
  cashflow_balance: 1245000,
  outstanding_loans: 725000,
  credit_health_score: 73,
  risk_class: 'Good',
  unread_alerts: 2,
  open_receivables: 3,
  deltas: {
    cashflow_balance: { value: 18.6, label: '+18.6% vs previous period', direction: 'up' },
    total_income: { value: 12.4, label: '+12.4% vs previous period', direction: 'up' },
    total_expenses: { value: 8.7, label: '+8.7% vs previous period', direction: 'down' },
    net_profit: { value: 24.1, label: '+24.1% vs previous period', direction: 'up' },
    credit_health_score: { value: 8, label: '+8 pts vs previous period', direction: 'up' },
  },
}

const fallbackTrends: TrendPoint[] = [
  { month: 'May 12', income: 460000, expenses: 260000, net_cashflow: 200000 },
  { month: 'May 19', income: 520000, expenses: 310000, net_cashflow: 210000 },
  { month: 'May 26', income: 610000, expenses: 355000, net_cashflow: 255000 },
  { month: 'Jun 2', income: 580000, expenses: 330000, net_cashflow: 250000 },
  { month: 'Jun 9', income: 720000, expenses: 390000, net_cashflow: 330000 },
  { month: 'Jun 12', income: 690000, expenses: 365000, net_cashflow: 325000 },
]

const fallbackBreakdown: BreakdownPoint[] = [
  { category: 'Inventory / Stock', value: 35 },
  { category: 'Business services', value: 25 },
  { category: 'Salaries & Wages', value: 15 },
  { category: 'Rent & Utilities', value: 10 },
  { category: 'Marketing', value: 3 },
  { category: 'Other Expenses', value: 12 },
]

const fallbackInvoices: Invoice[] = [
  { id: 1, invoice_number: 'INV-001', customer_name: 'Nairobi Traders', amount: 250000, issue_date: '2025-05-28', due_date: '2025-06-04', status: 'overdue' },
  { id: 2, invoice_number: 'INV-002', customer_name: 'Greenfield Supplies', amount: 180000, issue_date: '2025-06-02', due_date: '2025-06-17', status: 'sent' },
  { id: 3, invoice_number: 'INV-003', customer_name: 'Metro Retail Ltd', amount: 120000, issue_date: '2025-06-07', due_date: '2025-06-22', status: 'sent' },
]

const fallbackLoans: Loan[] = [
  { id: 1, lender: 'Equity Bank', product_name: 'Working Capital Loan', principal_amount: 950000, outstanding_balance: 725000, monthly_installment: 125000, next_due_date: '2025-06-20', repayment_progress: 65, status: 'current' },
]

const fallbackAlerts: Alert[] = [
  { id: 1, type: 'receivable', severity: 'warning', title: 'Pending Receivables', message: 'KES 450,000 in receivables are due in the next 7 days.', is_read: false },
  { id: 2, type: 'expense', severity: 'warning', title: 'High Expense Detected', message: 'Inventory expenses increased by 28% compared to last month.', is_read: false },
  { id: 3, type: 'invoice', severity: 'warning', title: 'Invoice Overdue', message: 'Nairobi Traders invoice is 8 days overdue.', is_read: true },
]

const fallbackRecommendations: Recommendation[] = [
  { id: 1, category: 'Cashflow', priority: 'high', title: 'Follow up overdue invoices', description: 'Prioritize Nairobi Traders and Greenfield Supplies to improve short-term cash position.', is_completed: false },
  { id: 2, category: 'Expenses', priority: 'medium', title: 'Review inventory purchases', description: 'Inventory costs are above the recent average and should be reviewed before restocking.', is_completed: false },
]

function App() {
  const [token, setToken] = useState(localStorage.getItem('cashcred_token'))
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('cashcred_user')
    return stored ? JSON.parse(stored) as User : null
  })
  const [view, setView] = useState<ViewKey>('dashboard')
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<DateFilters>(defaultFilters)
  const [filterDraft, setFilterDraft] = useState<DateFilters>(defaultFilters)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const query = selectedBusiness ? { business_id: selectedBusiness } : undefined

  const buildParams = useCallback((nextBusiness = selectedBusiness, nextFilters = filters) => {
    const params: Record<string, string> = {}
    if (nextBusiness) params.business_id = nextBusiness
    if (nextFilters.date_from) params.date_from = nextFilters.date_from
    if (nextFilters.date_to) params.date_to = nextFilters.date_to
    return Object.keys(params).length > 0 ? params : undefined
  }, [filters, selectedBusiness])

  const loadData = useCallback(async (nextBusiness = selectedBusiness, nextFilters = filters) => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = buildParams(nextBusiness, nextFilters)
      const [businesses, summary, trends, breakdown, loanProgress, transactions, invoices, loans, alerts, recommendations, credit] = await Promise.all([
        api.get<BusinessProfile[]>('/businesses'),
        api.get<Summary>('/dashboard/summary', { params }),
        api.get<TrendPoint[]>('/dashboard/cashflow-trends', { params }),
        api.get<BreakdownPoint[]>('/dashboard/expense-breakdown', { params }),
        api.get<LoanProgress[]>('/dashboard/loan-progress', { params }),
        api.get<Transaction[]>('/transactions', { params }),
        api.get<Invoice[]>('/invoices', { params }),
        api.get<Loan[]>('/loans', { params }),
        api.get<Alert[]>('/alerts', { params }),
        api.get<Recommendation[]>('/recommendations', { params }),
        api.get<CreditHealth>('/credit-health', { params }),
      ])
      const firstBusiness = businesses.data[0]
      const activeBusiness = nextBusiness || String(summary.data.business?.id ?? firstBusiness?.id ?? '')
      if (activeBusiness && activeBusiness !== selectedBusiness) setSelectedBusiness(activeBusiness)
      setData({
        businesses: businesses.data,
        summary: summary.data,
        trends: trends.data,
        breakdown: breakdown.data,
        loanProgress: loanProgress.data,
        transactions: transactions.data,
        invoices: invoices.data,
        loans: loans.data,
        alerts: alerts.data,
        recommendations: recommendations.data,
        credit: credit.data,
      })
    } catch {
      setError('Unable to load financial data. Confirm the Laravel API is running and seeded.')
    } finally {
      setLoading(false)
    }
  }, [buildParams, filters, selectedBusiness, token])

  useEffect(() => {
    if (token) void loadData()
  }, [loadData, token])

  function handleLogin(nextToken: string, nextUser: User) {
    localStorage.setItem('cashcred_token', nextToken)
    localStorage.setItem('cashcred_user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  function logout() {
    localStorage.removeItem('cashcred_token')
    localStorage.removeItem('cashcred_user')
    setToken(null)
    setUser(null)
    setData(emptyData)
  }

  function applyFilters() {
    setFilters(filterDraft)
    if (filters.date_from === filterDraft.date_from && filters.date_to === filterDraft.date_to) {
      void loadData(selectedBusiness, filterDraft)
    }
  }

  function clearFilters() {
    setFilterDraft(defaultFilters)
    setFilters(defaultFilters)
    if (!filters.date_from && !filters.date_to) {
      void loadData(selectedBusiness, defaultFilters)
    }
  }

  async function downloadReport() {
    setDownloadLoading(true)
    setError('')
    try {
      const response = await api.get<Blob>('/reports/dashboard', { params: buildParams(), responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateFrom = filters.date_from || 'all'
      const dateTo = filters.date_to || 'all'
      link.href = url
      link.download = `cashcred360-dashboard-${dateFrom}-to-${dateTo}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Unable to download report. Confirm the API is running and try again.')
    } finally {
      setDownloadLoading(false)
    }
  }

  if (!token || !user) return <AuthScreen onLogin={handleLogin} />

  const activeBusinessName = data.summary?.business?.business_name ?? user.business_profile?.business_name ?? fallbackSummary.business?.business_name ?? 'ABC Enterprises Ltd'
  const activeBusinessType = data.summary?.business?.sector ?? user.business_profile?.sector ?? (user.role === 'sme' ? 'SME Account' : 'Bank Admin')
  const filterChanged = filters.date_from !== defaultFilters.date_from || filters.date_to !== defaultFilters.date_to || filterDraft.date_from !== defaultFilters.date_from || filterDraft.date_to !== defaultFilters.date_to

  return (
    <div className="min-h-screen bg-[#f4faf6] text-[#07162d]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[276px] flex-col bg-[#01152d] text-white lg:flex">
        <Brand businessName={activeBusinessName} businessType={activeBusinessType} />
        <nav className="flex-1 space-y-1 px-4 py-5">
          {navItems.map((item) => <NavButton key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} />)}
        </nav>
        <SidebarGuidance />
      </aside>

      <main className="min-h-screen lg:pl-[276px]">
        <header className="sticky top-0 z-20 border-b border-[#dfe8e4] bg-[#f8fbfa]/95 px-4 py-4 backdrop-blur lg:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-[#07162d]">{titleFor(view)}</h1>
              <p className="mt-1 text-sm text-slate-500">{view === 'dashboard' ? 'Overview of your business financial health' : 'Manage your business financial activity'}</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:items-center xl:justify-end">
              <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#d7e4df] bg-white px-2 py-1 shadow-sm sm:col-span-2 sm:grid-cols-[auto_minmax(7.5rem,1fr)_auto_minmax(7.5rem,1fr)_auto_auto] xl:w-auto">
                <CalendarDays className="text-slate-500" size={16} />
                <input
                  className="h-8 min-w-0 rounded-md border border-transparent px-2 text-sm font-medium text-slate-700 outline-none focus:border-[#d7e4df]"
                  aria-label="Start date"
                  type="date"
                  value={filterDraft.date_from}
                  onChange={(event) => setFilterDraft({ ...filterDraft, date_from: event.target.value })}
                />
                <span className="text-center text-xs text-slate-400">to</span>
                <input
                  className="col-start-2 h-8 min-w-0 rounded-md border border-transparent px-2 text-sm font-medium text-slate-700 outline-none focus:border-[#d7e4df] sm:col-start-auto"
                  aria-label="End date"
                  type="date"
                  value={filterDraft.date_to}
                  onChange={(event) => setFilterDraft({ ...filterDraft, date_to: event.target.value })}
                />
                <button type="button" onClick={applyFilters} className="h-8 rounded-md bg-[#01152d] px-3 text-xs font-semibold text-white">Apply</button>
                {filterChanged && (
                  <button type="button" onClick={clearFilters} className="h-8 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-[#07162d]">Reset</button>
                )}
              </div>
              <button type="button" onClick={() => void downloadReport()} disabled={downloadLoading} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto xl:w-auto">
                <Download size={16} /> <span>{downloadLoading ? 'Downloading...' : 'Download Report'}</span> <ChevronDown className="hidden sm:block" size={14} />
              </button>
              {user.role !== 'sme' && data.businesses.length > 0 ? (
                <select
                  className="h-10 w-full rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm sm:w-auto xl:w-auto"
                  value={selectedBusiness}
                  onChange={(event) => {
                    setSelectedBusiness(event.target.value)
                  }}
                >
                  {data.businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}
                </select>
              ) : (
                <div className="inline-flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm sm:w-auto xl:w-auto">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> <span className="truncate">{activeBusinessName}</span>
                </div>
              )}
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm sm:w-auto xl:w-auto" onClick={() => void loadData()} type="button" aria-label="Refresh dashboard data">
                <RefreshCw size={16} /> <span>Refresh</span>
              </button>
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#01152d] px-3 text-sm font-semibold text-white shadow-sm sm:w-auto xl:w-auto" onClick={logout} type="button">
                <LogOut size={16} /> <span>Logout</span>
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => <NavButton key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} compact />)}
          </div>
        </header>

        <div className="px-4 py-5 lg:px-7">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading financial analytics...</div>}
          {view === 'dashboard' && <Dashboard data={data} />}
          {view === 'transactions' && <Transactions data={data} query={query} reload={() => loadData()} />}
          {view === 'expenses' && <Expenses data={data} />}
          {view === 'invoices' && <Invoices data={data} query={query} reload={() => loadData()} />}
          {view === 'loans' && <Loans data={data} query={query} reload={() => loadData()} />}
          {view === 'credit' && <CreditHealthView credit={data.credit} />}
          {view === 'reports' && <Reports data={data} />}
          {view === 'alerts' && <AlertsView alerts={data.alerts} reload={() => loadData()} />}
          {view === 'recommendations' && <RecommendationsView recommendations={data.recommendations} credit={data.credit} reload={() => loadData()} />}
        </div>
      </main>
    </div>
  )
}
function AuthScreen({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: 'sme.owner@cashcred.test', password: 'password123', business_name: 'Savanna Office Supplies', sector: 'Wholesale and Retail' })
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const payload = mode === 'login' ? { email: form.email, password: form.password } : { ...form, role: 'sme' }
      const response = await api.post<{ token: string; user: User }>(endpoint, payload)
      onLogin(response.data.token, response.data.user)
    } catch {
      setError('Authentication failed. Use the seeded demo account or create a new SME account.')
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fbfe] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1672px] gap-8 px-5 py-7 lg:grid-cols-[minmax(0,1.18fr)_440px] lg:items-center lg:px-16 xl:px-24">
        <section className="relative hidden min-h-[860px] overflow-hidden rounded-[2rem] bg-[#f8fbfe] lg:block">
          <div className="absolute -left-24 top-14 h-64 w-64 rounded-full bg-emerald-200/45 blur-3xl" />
          <div className="absolute left-80 top-0 h-52 w-52 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative z-10 max-w-3xl pt-5">
            <div className="mb-16 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#061938] text-white shadow-lg shadow-slate-300/60">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-xl font-bold tracking-[0.14em] text-[#0f172a]">CASHCRED360</p>
                <p className="mt-1 text-sm font-medium text-slate-500">Banking-grade analytics for SMEs</p>
              </div>
            </div>

            <h1 className="max-w-2xl text-[4.45rem] font-semibold leading-[0.98] tracking-normal text-[#081629]">
              SME Cashflow &<br />Credit Health Assistant
            </h1>
            <p className="mt-8 max-w-3xl text-[1.08rem] leading-8 text-slate-600">
              Monitor income, expenses, receivables, loan obligations, repayment capacity, and credit readiness from one banking-grade analytics workspace.
            </p>

            <div className="mt-10 grid max-w-3xl grid-cols-3 gap-4">
              <AuthFeature icon={LineChart} title="Cashflow trends" description="Track inflows, outflows and cash position." />
              <AuthFeature icon={ShieldCheck} title="Credit risk scoring" description="Understand what improves credit health." />
              <AuthFeature icon={Target} title="Loan readiness" description="Assess eligibility and repayment capacity." />
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-[1.1fr_0.9fr] gap-4">
              <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cashflow Trend</p>
                    <p className="mt-2 text-2xl font-bold text-[#0f172a]">KES 1,245,000</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-600">18.6% vs last 30 days</p>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Net +</div>
                </div>
                <AuthCashflowPreview />
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Cash inflow</span>
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#dbeafe]" /> Cash outflow</span>
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#0f172a]" /> Net cashflow</span>
                </div>
              </section>

              <div className="grid gap-4">
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Credit Health</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-5xl font-bold text-[#0f172a]">78</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-600">Good</p>
                    </div>
                    <div className="relative h-20 w-20 rounded-full bg-[conic-gradient(#16a34a_0_78%,#e5e7eb_78%_100%)]">
                      <div className="absolute inset-2 rounded-full bg-white" />
                    </div>
                  </div>
                </section>
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Expense Breakdown</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <ExpenseRow label="Stock" value="28%" color="bg-blue-600" />
                    <ExpenseRow label="Wages" value="19%" color="bg-emerald-600" />
                    <ExpenseRow label="Rent & utilities" value="10%" color="bg-amber-500" />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="mx-auto w-full max-w-[440px] rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-200/80 sm:p-8">
          <div className="mb-7 lg:hidden">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#061938] text-white"><Building2 size={22} /></div>
              <div>
                <p className="text-lg font-bold tracking-[0.12em] text-[#0f172a]">CASHCRED360</p>
                <p className="text-xs font-medium text-slate-500">Banking-grade analytics for SMEs</p>
              </div>
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-[#081629]">SME Cashflow & Credit Health Assistant</h1>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
            <button type="button" onClick={() => setMode('login')} className={`h-12 rounded-xl px-3 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-[#081629] shadow-sm' : 'text-slate-500'}`}>Login</button>
            <button type="button" onClick={() => setMode('register')} className={`h-12 rounded-xl px-3 text-sm font-bold transition ${mode === 'register' ? 'bg-white text-[#081629] shadow-sm' : 'text-slate-500'}`}>Register SME</button>
          </div>

          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
          {mode === 'register' && <AuthInput label="Owner name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />}
          <AuthInput label="Email" icon={Mail} value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" required />
          <AuthInput
            label="Password"
            icon={LockKeyhole}
            value={form.password}
            onChange={(value) => setForm({ ...form, password: value })}
            type={showPassword ? 'text' : 'password'}
            trailing={
              <button
                type="button"
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />
          {mode === 'register' && <AuthInput label="Business name" value={form.business_name} onChange={(value) => setForm({ ...form, business_name: value })} required />}
          {mode === 'register' && <AuthInput label="Sector" value={form.sector} onChange={(value) => setForm({ ...form, sector: value })} required />}

          <div className="mt-2 flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 font-medium text-slate-600">
              <input className="h-4 w-4 rounded border-slate-300 text-blue-700" checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
              Remember me
            </label>
            <button className="font-semibold text-blue-700" type="button">Forgot password?</button>
          </div>

          <button className="mt-6 h-12 w-full rounded-2xl bg-[#0b63f6] px-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0758df]" type="submit">
            {mode === 'login' ? 'Access dashboard' : 'Create SME account'}
          </button>

          <div className="my-6 flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            <p><span className="font-semibold text-slate-800">Demo SME:</span> sme.owner@cashcred.test / password123</p>
            <p><span className="font-semibold text-slate-800">Bank admin:</span> bank.admin@cashcred.test / password123</p>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-sm leading-6 text-slate-600">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={19} />
            <p>Your data is encrypted and secure with enterprise-grade protection.</p>
          </div>
        </form>
      </div>
    </div>
  )
}

function AuthCashflowPreview() {
  const groups = [
    { inflow: 46, outflow: 26, net: 18 },
    { inflow: 66, outflow: 39, net: 31 },
    { inflow: 57, outflow: 34, net: 24 },
    { inflow: 84, outflow: 47, net: 42 },
    { inflow: 71, outflow: 42, net: 35 },
    { inflow: 104, outflow: 56, net: 55 },
    { inflow: 91, outflow: 48, net: 47 },
  ]

  return (
    <div className="mt-7 h-32 border-b border-slate-100 pb-2">
      <svg className="h-full w-full overflow-visible" viewBox="0 0 420 128" role="img" aria-label="Cashflow trend preview">
        <line x1="0" x2="420" y1="124" y2="124" stroke="#e2e8f0" strokeWidth="1" />
        {groups.map((group, index) => {
          const x = 16 + index * 57
          return (
            <g key={index}>
              <rect x={x} y={124 - group.outflow} width="13" height={group.outflow} rx="4" fill="#dbeafe" />
              <rect x={x + 17} y={124 - group.inflow} width="13" height={group.inflow} rx="4" fill="#16a34a" />
              <rect x={x + 34} y={124 - group.net} width="13" height={group.net} rx="4" fill="#0f172a" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AuthFeature({ icon: Icon, title, description }: { icon: typeof LineChart; title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={20} /></div>
      <h3 className="text-sm font-bold text-[#0f172a]">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function AuthInput({ label, value, onChange, icon: Icon, trailing, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; icon?: typeof Mail; trailing?: ReactNode; type?: string; required?: boolean }) {
  return (
    <label className="mb-4 block text-sm font-bold text-slate-700">
      {label}
      <span className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm shadow-slate-100 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
        {Icon && <Icon className="shrink-0 text-slate-400" size={18} />}
        <input className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} />
        {trailing}
      </span>
    </label>
  )
}

function ExpenseRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span>{value}</span></div>
      <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{ width: value }} /></div>
    </div>
  )
}

function Dashboard({ data }: { data: AppData }) {
  const hasApiData = data.summary !== null
  const summary = data.summary ?? fallbackSummary
  const trends = hasApiData ? data.trends : fallbackTrends
  const breakdown = hasApiData ? data.breakdown : fallbackBreakdown
  const invoices = hasApiData ? data.invoices : fallbackInvoices
  const loans = hasApiData ? data.loans : fallbackLoans
  const alerts = hasApiData ? data.alerts : fallbackAlerts
  const recommendations = hasApiData ? data.recommendations : fallbackRecommendations
  const creditScore = data.credit?.score ?? summary.credit_health_score
  const riskClass = data.credit?.risk_class ?? summary.risk_class
  const forecastBalance = summary.cashflow_balance + Math.max(0, summary.net_profit * 0.31)
  const topInvoices = [...invoices].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3)
  const primaryLoan = loans[0] ?? fallbackLoans[0]
  const trendPoints = trends.length > 0 ? trends : fallbackTrends
  const delta = (key: keyof NonNullable<Summary['deltas']>, fallback: string, fallbackDirection: 'up' | 'down' | 'flat' = 'up') => summary.deltas?.[key] ?? { label: fallback, direction: fallbackDirection, value: 0 }

  const cards = [
    { label: 'Cashflow Balance', value: currency.format(summary.cashflow_balance), delta: delta('cashflow_balance', '+18.6% vs previous period'), icon: WalletCards, tone: 'text-emerald-700', bg: 'bg-emerald-50', points: trendPoints.map((item) => Number(item.net_cashflow)) },
    { label: 'Total Income', value: currency.format(summary.total_income), delta: delta('total_income', '+12.4% vs previous period'), icon: TrendingUp, tone: 'text-emerald-700', bg: 'bg-emerald-50', points: trendPoints.map((item) => Number(item.income)) },
    { label: 'Total Expenses', value: currency.format(summary.total_expenses), delta: delta('total_expenses', '+8.7% vs previous period', 'down'), icon: TrendingDown, tone: 'text-red-700', bg: 'bg-red-50', points: trendPoints.map((item) => Number(item.expenses)) },
    { label: 'Net Profit', value: currency.format(summary.net_profit), delta: delta('net_profit', '+24.1% vs previous period'), icon: CircleDollarSign, tone: 'text-blue-700', bg: 'bg-blue-50', points: trendPoints.map((item) => Number(item.net_cashflow)) },
    { label: 'Credit Health Score', value: String(creditScore), delta: { ...delta('credit_health_score', '+8 pts vs previous period'), label: `${riskClass} · ${delta('credit_health_score', '+8 pts vs previous period').label}` }, icon: ShieldCheck, tone: 'text-emerald-700', bg: 'bg-emerald-50', points: [] },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => <DashboardKpi key={card.label} {...card} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr_0.9fr]">
        <DashboardPanel title="Cashflow Trend" action="Last 12 Months" className="xl:col-span-1">
          <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
            <LegendDot color="bg-emerald-600" label="Cash Inflow" />
            <LegendDot color="bg-[#9bb7bd]" label="Cash Outflow" />
            <LegendDot color="bg-[#01152d]" label="Net Cashflow" />
          </div>
          <div className="h-[285px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e8efec" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Area type="monotone" dataKey="income" stroke="#059669" fill="#dff3e8" fillOpacity={0.55} strokeWidth={2.5} name="Cash Inflow" />
                <Area type="monotone" dataKey="expenses" stroke="#88a995" fill="#e9f1ef" fillOpacity={0.5} strokeWidth={2.5} name="Cash Outflow" />
                <Area type="monotone" dataKey="net_cashflow" stroke="#01152d" fill="#d9e1e6" fillOpacity={0.3} strokeWidth={2.5} name="Net Cashflow" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Expense Breakdown" action="By Category">
          <ExpenseBreakdownVisual data={breakdown} />
        </DashboardPanel>

        <DashboardPanel title="Cashflow Forecast" action="Next 30 Days">
          <div className="rounded-2xl bg-[#f4faf6] p-4">
            <p className="text-sm font-medium text-slate-500">Expected Cash Balance</p>
            <p className="mt-3 text-3xl font-semibold text-[#07162d]">{currency.format(forecastBalance)}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">+15.3%</p>
            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastSeries(trends)} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <Area type="monotone" dataKey="value" stroke="#059669" fill="#dff3e8" strokeWidth={2.5} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => currency.format(Number(value))} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Forecast is based on your income & expense patterns</p>
        </DashboardPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardPanel title="Top Customers (Receivables)" action="View all">
          <div className="space-y-3">
            {topInvoices.length > 0 ? topInvoices.map((invoice) => <ReceivableRow key={invoice.id} invoice={invoice} />) : <EmptyState label="No receivables in this period" />}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Loans & Obligations" action="View All">
          {loans.length > 0 ? <LoanSnapshot loan={primaryLoan} /> : <EmptyState label="No loan obligations in this period" />}
        </DashboardPanel>

        <DashboardPanel title="Recent Alerts" action="View All">
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.slice(0, 3).map((alert) => <DashboardAlertRow key={alert.id} alert={alert} />) : <EmptyState label="No alerts in this period" />}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Recommended for You" action="View All Recommendations">
        <div className="grid gap-3 lg:grid-cols-2">
          {recommendations.length > 0 ? recommendations.slice(0, 2).map((item) => <DashboardRecommendation key={item.id} recommendation={item} />) : <EmptyState label="No recommendations in this period" />}
        </div>
      </DashboardPanel>
    </div>
  )
}

function DashboardKpi({ label, value, delta, icon: Icon, tone, bg, points }: { label: string; value: string; delta: { label: string; direction: 'up' | 'down' | 'flat' }; icon: typeof TrendingUp; tone: string; bg: string; points: number[] }) {
  const isScore = label === 'Credit Health Score'
  const score = Number(value) || 0
  const deltaTone = delta.direction === 'down' ? 'text-red-700' : delta.direction === 'flat' ? 'text-slate-500' : 'text-emerald-700'

  return (
    <section className="relative min-h-[154px] overflow-hidden rounded-2xl border border-[#dfe8e4] bg-white p-4 shadow-sm">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-3 truncate text-2xl font-semibold tracking-normal text-[#07162d]">{value}</p>
        </div>
        {isScore ? (
          <ScoreRing score={score} />
        ) : (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg} ${tone}`}><Icon size={18} /></div>
        )}
      </div>
      <p className={`relative z-10 mt-3 text-xs font-medium ${deltaTone}`}>{delta.label}</p>
      {isScore ? (
        <button type="button" className="relative z-10 mt-3 text-xs font-semibold text-blue-700">View Score Details</button>
      ) : (
        <MiniKpiCurve points={points} direction={delta.direction} />
      )}
    </section>
  )
}

function ScoreRing({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, score))
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-label={`Credit health score ${value} out of 100`}>
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 52 52" role="img">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="#e6f2ec" strokeWidth="6" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="#059669"
          strokeLinecap="round"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-semibold text-[#07162d]">{Math.round(value)}</span>
    </div>
  )
}

function MiniKpiCurve({ points, direction }: { points: number[]; direction: 'up' | 'down' | 'flat' }) {
  const values = points.length >= 2 ? points.slice(-8) : [0, 0]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? 180 : (index / (values.length - 1)) * 180
    const y = 38 - ((value - min) / range) * 30
    return { x, y }
  })
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
  const area = `${line} L180 46 L0 46 Z`
  const stroke = direction === 'down' ? '#dc2626' : direction === 'flat' ? '#64748b' : '#059669'
  const fill = direction === 'down' ? '#fee2e2' : direction === 'flat' ? '#e2e8f0' : '#dff3e8'
  const last = coords[coords.length - 1]

  return (
    <svg className="absolute inset-x-3 bottom-2 h-12 w-[calc(100%-1.5rem)]" viewBox="0 0 180 46" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={fill} opacity="0.72" />
      <path d={line} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <circle cx={last.x} cy={last.y} r="4" fill="#ffffff" stroke={stroke} strokeWidth="2" />
    </svg>
  )
}

function DashboardPanel({ title, action, children, className = '' }: { title: string; action?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#dfe8e4] bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-normal text-[#07162d]">{title}</h2>
        {action && <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#07162d]">{action} <ArrowUpRight size={13} /></button>}
      </div>
      {children}
    </section>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
}

function ExpenseBreakdownVisual({ data }: { data: BreakdownPoint[] }) {
  const visibleData = data.slice(0, 6).filter((item) => Number(item.value) > 0)
  const total = visibleData.reduce((sum, item) => sum + Number(item.value), 0)

  return (
    <div className="grid items-center gap-5">
      <ExpenseDonut data={visibleData} total={total} />
      {visibleData.length > 0 && total > 0 ? <ExpenseBreakdownList data={visibleData} total={total} /> : <p className="text-center text-sm text-slate-500">No expense breakdown in this period</p>}
    </div>
  )
}

function ExpenseDonut({ data, total }: { data: BreakdownPoint[]; total: number }) {
  const radius = 72
  const strokeWidth = 26
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative mx-auto h-56 w-56 shrink-0" role="img" aria-label="Expense breakdown donut chart">
      <svg className="h-full w-full" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#edf4f1" strokeWidth={strokeWidth} />
        {total > 0 && data.map((item, index) => {
          const length = (Number(item.value) / total) * circumference
          const segment = (
            <circle
              key={item.category}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              transform="rotate(-90 100 100)"
            />
          )
          offset += length
          return segment
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-semibold uppercase text-slate-400">Total</span>
        <span className="mt-1 max-w-32 text-lg font-semibold leading-tight text-[#07162d]">{total > 0 ? currency.format(total) : 'No data'}</span>
      </div>
    </div>
  )
}

function ExpenseBreakdownList({ data, total }: { data: BreakdownPoint[]; total: number }) {
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percent = Math.round((Number(item.value) / Math.max(total, 1)) * 100)
        const width = total <= 100 ? Number(item.value) : percent
        const value = total <= 100 ? `${item.value}%` : `${percent}%`
        return <ExpenseProgress key={item.category} label={item.category} value={value} width={width} color={chartColors[index % chartColors.length]} />
      })}
    </div>
  )
}

function ExpenseProgress({ label, value, width, color }: { label: string; value: string | number; width: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-[#07162d]">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#eef4f1]"><div className="h-2.5 rounded-full" style={{ width: `${Math.max(4, Math.min(100, width))}%`, backgroundColor: color }} /></div>
    </div>
  )
}

function forecastSeries(trends: TrendPoint[]) {
  return trends.slice(-5).map((item, index) => ({ label: index === 4 ? 'Jul 10' : item.month, value: Number(item.net_cashflow) + 1180000 + index * 28000 }))
}

function ReceivableRow({ invoice }: { invoice: Invoice }) {
  const isOverdue = invoice.status === 'overdue'
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f8fbfa] px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#07162d]">{invoice.customer_name}</p>
        <p className={`mt-1 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>{isOverdue ? 'Overdue' : `Due ${dateOnly(invoice.due_date)}`}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-[#07162d]">{currency.format(invoice.amount)}</p>
    </div>
  )
}

function LoanSnapshot({ loan }: { loan: Loan }) {
  return (
    <div>
      <div className="rounded-xl bg-[#f8fbfa] p-4">
        <p className="text-sm font-semibold text-[#07162d]">{loan.product_name ?? 'Working Capital Loan'}</p>
        <p className="mt-1 text-xs text-slate-500">{loan.lender}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">Next Repayment</p>
            <p className="mt-1 text-lg font-semibold text-[#07162d]">{currency.format(loan.monthly_installment)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Due on</p>
            <p className="mt-1 text-sm font-semibold text-[#07162d]">{dateOnly(loan.next_due_date)}</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-500">Repayment Progress</span><span className="font-semibold text-[#07162d]">{loan.repayment_progress}%</span></div>
        <div className="h-3 rounded-full bg-[#eef4f1]"><div className="h-3 rounded-full bg-emerald-600" style={{ width: `${Math.max(0, Math.min(100, loan.repayment_progress))}%` }} /></div>
      </div>
      <p className="mt-5 text-sm font-semibold text-emerald-700">Good job!</p>
    </div>
  )
}

function DashboardAlertRow({ alert }: { alert: Alert }) {
  return (
    <div className="flex gap-3 rounded-xl bg-[#f8fbfa] px-3 py-3">
      <AlertTriangle className={alert.severity === 'warning' ? 'mt-0.5 shrink-0 text-amber-600' : 'mt-0.5 shrink-0 text-blue-600'} size={17} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#07162d]">{alert.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{alert.message}</p>
      </div>
    </div>
  )
}

function DashboardRecommendation({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="rounded-xl border border-[#dfe8e4] bg-[#f8fbfa] p-4">
      <p className="text-xs font-semibold uppercase text-emerald-700">{recommendation.category} · {recommendation.priority}</p>
      <h3 className="mt-2 text-sm font-semibold text-[#07162d]">{recommendation.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.description}</p>
    </div>
  )
}

function Transactions({ data, query, reload }: { data: AppData; query?: object; reload: () => void }) {
  return (
    <ModuleLayout title="Transactions" action={<TransactionForm query={query} reload={reload} />}>
      <DataTable headers={['Date', 'Type', 'Category', 'Description', 'Amount', 'Status']} rows={data.transactions.map((item) => [dateOnly(item.transaction_date), item.type, item.category, item.description ?? '-', currency.format(item.amount), item.status])} />
    </ModuleLayout>
  )
}

function Expenses({ data }: { data: AppData }) {
  const expenses = data.transactions.filter((item) => item.type === 'expense')
  const categories = ['All categories', ...Array.from(new Set(expenses.map((item) => item.category))).sort()]
  const [category, setCategory] = useState('All categories')
  const filteredExpenses = category === 'All categories' ? expenses : expenses.filter((item) => item.category === category)
  const filteredTotal = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const filteredBreakdown = category === 'All categories'
    ? data.breakdown
    : filteredTotal > 0 ? [{ category, value: filteredTotal }] : []

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <ChartPanel title="Expense mix">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#07162d]">{currency.format(filteredTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">{category === 'All categories' ? 'All expense categories' : category}</p>
          </div>
          <select className="h-10 w-full rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm sm:w-52" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter expenses by category">
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <ExpensePie data={filteredBreakdown} />
      </ChartPanel>
      <ModuleLayout title={`Expense ledger ${currency.format(filteredTotal)}`}>
        <DataTable headers={['Date', 'Category', 'Description', 'Amount', 'Status']} rows={filteredExpenses.map((item) => [dateOnly(item.transaction_date), item.category, item.description ?? '-', currency.format(item.amount), item.status])} />
      </ModuleLayout>
    </div>
  )
}

function Invoices({ data, query, reload }: { data: AppData; query?: object; reload: () => void }) {
  return (
    <ModuleLayout title="Invoices and receivables" action={<InvoiceForm query={query} reload={reload} />}>
      <DataTable headers={['Invoice', 'Customer', 'Amount', 'Issued', 'Due', 'Status']} rows={data.invoices.map((item) => [item.invoice_number, item.customer_name, currency.format(item.amount), dateOnly(item.issue_date), dateOnly(item.due_date), item.status])} />
    </ModuleLayout>
  )
}

function Loans({ data, query, reload }: { data: AppData; query?: object; reload: () => void }) {
  return (
    <ModuleLayout title="Loans and obligations" action={<LoanForm query={query} reload={reload} />}>
      <DataTable headers={['Lender', 'Product', 'Outstanding', 'Installment', 'Due date', 'Progress', 'Status']} rows={data.loans.map((item) => [item.lender, item.product_name ?? '-', currency.format(item.outstanding_balance), currency.format(item.monthly_installment), dateOnly(item.next_due_date), `${item.repayment_progress}%`, item.status])} />
    </ModuleLayout>
  )
}

function CreditHealthView({ credit }: { credit: CreditHealth | null }) {
  if (!credit) return <EmptyState label="No credit health data loaded" />
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Credit health score</p>
        <div className="mt-5 flex items-center gap-5"><ScoreRing score={credit.score} /><div><div className="flex items-end gap-2"><span className="text-6xl font-semibold">{credit.score}</span><span className="pb-2 text-lg text-slate-500">/100</span></div><RiskBadge risk={credit.risk_class} /></div></div>
        <div className="mt-6 space-y-3">
          {Object.entries(credit.factors).map(([key, value]) => <Progress key={key} label={key.replaceAll('_', ' ')} value={value} />)}
        </div>
      </section>
      <ModuleLayout title="Actionable credit recommendations">
        <div className="grid gap-3">
          {credit.recommendations.map((item) => <Insight key={item.title} title={item.title} description={item.description} />)}
        </div>
      </ModuleLayout>
    </div>
  )
}

function AlertsView({ alerts, reload }: { alerts: Alert[]; reload: () => void }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const unreadCount = alerts.filter((alert) => !alert.is_read).length
  const readCount = alerts.length - unreadCount
  const warningCount = alerts.filter((alert) => alert.severity === 'warning').length
  const unreadWarnings = alerts.filter((alert) => !alert.is_read && alert.severity === 'warning').length
  const severityOptions = ['all', ...Array.from(new Set(alerts.map((alert) => alert.severity))).sort()]
  const severityCounts = countBy(alerts, (alert) => alert.severity || 'info')
  const typeCounts = countBy(alerts, (alert) => alert.type || 'general')
  const topType = topEntry(typeCounts)
  const readRate = alerts.length > 0 ? Math.round((readCount / alerts.length) * 100) : 0
  const filteredAlerts = alerts.filter((alert) => {
    const statusMatches = statusFilter === 'all' || (statusFilter === 'unread' ? !alert.is_read : alert.is_read)
    const severityMatches = severityFilter === 'all' || alert.severity === severityFilter
    return statusMatches && severityMatches
  })
  const analysis = [
    { label: 'Primary signal', value: topType ? sentenceCase(topType[0]) : 'No signal', detail: topType ? `${topType[1]} alert${topType[1] === 1 ? '' : 's'} in this area` : 'No alerts in the selected period' },
    { label: 'Action queue', value: `${unreadCount} unread`, detail: unreadCount > 0 ? 'Review and mark handled items as read' : 'All alerts have been reviewed' },
    { label: 'Risk pressure', value: `${unreadWarnings} warning${unreadWarnings === 1 ? '' : 's'}`, detail: unreadWarnings > 0 ? 'Prioritize these before informational alerts' : 'No unread warnings pending' },
    { label: 'Resolution rate', value: `${readRate}%`, detail: `${readCount} of ${alerts.length} alerts marked read` },
  ]

  async function toggle(alert: Alert) {
    await api.put(`/alerts/${alert.id}`, { is_read: !alert.is_read })
    reload()
  }

  async function markAllRead() {
    const unread = alerts.filter((alert) => !alert.is_read)
    if (unread.length === 0) return
    await Promise.all(unread.map((alert) => api.put(`/alerts/${alert.id}`, { is_read: true })))
    reload()
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <section className="rounded-2xl border border-[#dfe8e4] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#07162d]">Insights overview</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <AlertStat label="Unread" value={unreadCount} tone="text-blue-700" />
          <AlertStat label="Total" value={alerts.length} tone="text-[#07162d]" />
          <AlertStat label="Warnings" value={warningCount} tone="text-amber-700" />
          <AlertStat label="Resolved" value={readCount} tone="text-emerald-700" />
        </div>

        <div className="mt-5 rounded-xl bg-[#f8fbfa] p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Analysis</p>
          <div className="mt-3 grid gap-3">
            {analysis.map((item) => <AlertAnalysisItem key={item.label} {...item} />)}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-[#f8fbfa] p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Severity mix</p>
          <div className="mt-3 space-y-3">
            {Object.entries(severityCounts).length > 0 ? Object.entries(severityCounts).map(([severity, count]) => (
              <AlertMixBar key={severity} label={sentenceCase(severity)} value={count} total={alerts.length} color={severityColor(severity)} />
            )) : <p className="text-sm text-slate-500">No severity data</p>}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-[#f8fbfa] p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Type distribution</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(typeCounts).length > 0 ? Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-[#dfe8e4]">{sentenceCase(type)} · {count}</span>
            )) : <span className="text-sm text-slate-500">No alert types</span>}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <select className="h-10 rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter alerts by status">
            <option value="all">All statuses</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
          <select className="h-10 rounded-lg border border-[#d7e4df] bg-white px-3 text-sm font-medium text-slate-700" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} aria-label="Filter alerts by severity">
            {severityOptions.map((item) => <option key={item} value={item}>{item === 'all' ? 'All severities' : sentenceCase(item)}</option>)}
          </select>
          <button type="button" onClick={() => void markAllRead()} disabled={unreadCount === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#01152d] px-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
            <CheckCircle2 size={16} /> Mark all read
          </button>
        </div>
      </section>

      <ModuleLayout title="Insights & Alerts">
        <div className="grid gap-3">
          {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => (
            <button key={alert.id} onClick={() => void toggle(alert)} className={`rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${alert.is_read ? 'border-[#dfe8e4] bg-white' : 'border-blue-200 bg-blue-50/45'}`} type="button">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <AlertSeverityIcon severity={alert.severity} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#07162d]">{alert.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityBadgeClass(alert.severity)}`}>{sentenceCase(alert.severity)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{sentenceCase(alert.type)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${alert.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>{alert.is_read ? 'Read' : 'New'}</span>
              </div>
            </button>
          )) : <EmptyState label="No alerts match the selected filters" />}
        </div>
      </ModuleLayout>
    </div>
  )
}

function AlertAnalysisItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-[#dfe8e4]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#07162d]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function AlertMixBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.max(6, Math.round((value / total) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span>{value}</span></div>
      <div className="h-2 rounded-full bg-white"><div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: color }} /></div>
    </div>
  )
}

function AlertStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-[#f8fbfa] p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function AlertSeverityIcon({ severity }: { severity: string }) {
  if (severity === 'success') return <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
  if (severity === 'warning') return <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
  return <Bell className="mt-0.5 shrink-0 text-blue-600" size={20} />
}

function severityBadgeClass(severity: string) {
  if (severity === 'success') return 'bg-emerald-100 text-emerald-700'
  if (severity === 'warning') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-700'
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function topEntry(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
}

function severityColor(severity: string) {
  if (severity === 'success') return '#059669'
  if (severity === 'warning') return '#d97706'
  return '#2563eb'
}

function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ') : 'Unknown'
}

function Reports({ data }: { data: AppData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartPanel title="Cashflow report"><CashflowChart data={data.trends} /></ChartPanel>
      <ChartPanel title="Income and expense report"><IncomeExpenseChart data={data.trends} /></ChartPanel>
      <ChartPanel title="Expense category report"><ExpensePie data={data.breakdown} /></ChartPanel>
      <ChartPanel title="Loan obligation report"><LoanProgressChart data={data.loanProgress} /></ChartPanel>
    </div>
  )
}

function RecommendationsView({ recommendations, credit, reload }: { recommendations: Recommendation[]; credit: CreditHealth | null; reload: () => void }) {
  async function toggle(item: Recommendation) {
    await api.put(`/recommendations/${item.id}`, { is_completed: !item.is_completed })
    reload()
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <ModuleLayout title="Recommendations">
        <div className="grid gap-3">
          {recommendations.map((item) => (
            <button key={item.id} onClick={() => void toggle(item)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm" type="button">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-blue-700">{item.category} / {item.priority}</p><h3 className="mt-1 font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.description}</p></div>{item.is_completed ? <CheckCircle2 className="text-emerald-600" /> : <Target className="text-slate-400" />}</div>
            </button>
          ))}
        </div>
      </ModuleLayout>
      <ModuleLayout title="Generated guidance">
        <div className="grid gap-3">{credit?.recommendations.map((item) => <Insight key={item.title} title={item.title} description={item.description} />)}</div>
      </ModuleLayout>
    </div>
  )
}

function TransactionForm({ query, reload }: { query?: object; reload: () => void }) {
  const [form, setForm] = useState({ type: 'income', category: incomeCategories[0], description: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), status: 'cleared' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    await api.post('/transactions', { ...form, amount: Number(form.amount) }, { params: query })
    setForm({ ...form, description: '', amount: '' })
    reload()
  }
  function changeType(value: string) {
    setForm({ ...form, type: value, category: categoriesFor(value)[0] })
  }
  return <InlineForm onSubmit={submit}><Select value={form.type} onChange={changeType} options={['income', 'expense']} /><Select value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={categoriesFor(form.type)} /><SmallInput placeholder="Amount" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} type="number" /><SmallInput value={form.transaction_date} onChange={(value) => setForm({ ...form, transaction_date: value })} type="date" /><SubmitButton /></InlineForm>
}

function InvoiceForm({ query, reload }: { query?: object; reload: () => void }) {
  const [form, setForm] = useState({ customer_name: '', amount: '', issue_date: new Date().toISOString().slice(0, 10), due_date: new Date().toISOString().slice(0, 10), status: 'sent' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    await api.post('/invoices', { ...form, amount: Number(form.amount) }, { params: query })
    setForm({ ...form, customer_name: '', amount: '' })
    reload()
  }
  return <InlineForm onSubmit={submit}><SmallInput placeholder="Customer" value={form.customer_name} onChange={(value) => setForm({ ...form, customer_name: value })} /><SmallInput placeholder="Amount" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} type="number" /><SmallInput value={form.due_date} onChange={(value) => setForm({ ...form, due_date: value })} type="date" /><Select value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['sent', 'paid', 'overdue', 'draft']} /><SubmitButton /></InlineForm>
}

function LoanForm({ query, reload }: { query?: object; reload: () => void }) {
  const [form, setForm] = useState({ lender: '', product_name: '', principal_amount: '', outstanding_balance: '', monthly_installment: '', repayment_progress: '0', status: 'current' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    await api.post('/loans', { ...form, principal_amount: Number(form.principal_amount), outstanding_balance: Number(form.outstanding_balance), monthly_installment: Number(form.monthly_installment), repayment_progress: Number(form.repayment_progress) }, { params: query })
    setForm({ ...form, lender: '', product_name: '', principal_amount: '', outstanding_balance: '', monthly_installment: '' })
    reload()
  }
  return <InlineForm onSubmit={submit}><SmallInput placeholder="Lender" value={form.lender} onChange={(value) => setForm({ ...form, lender: value })} /><SmallInput placeholder="Product" value={form.product_name} onChange={(value) => setForm({ ...form, product_name: value })} /><SmallInput placeholder="Outstanding" value={form.outstanding_balance} onChange={(value) => setForm({ ...form, outstanding_balance: value, principal_amount: value })} type="number" /><SmallInput placeholder="Installment" value={form.monthly_installment} onChange={(value) => setForm({ ...form, monthly_installment: value })} type="number" /><SubmitButton /></InlineForm>
}

function Brand({ businessName, businessType }: { businessName: string; businessType: string }) {
  return (
    <div className="border-b border-white/10 px-5 py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/10"><Building2 size={22} /></div>
        <div>
          <p className="text-lg font-semibold tracking-normal text-white">CashCred360</p>
          <p className="text-xs text-white/55">Banking analytics</p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="truncate text-sm font-semibold text-white">{businessName}</p>
        <p className="mt-1 text-xs text-white/55">{businessType}</p>
      </div>
    </div>
  )
}

function SidebarGuidance() {
  return (
    <div className="px-4 pb-5">
      <div className="rounded-2xl bg-white px-4 py-4 text-[#07162d]">
        <p className="text-sm font-semibold">Need financing?</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Check your loan readiness and grow your business.</p>
        <button type="button" className="mt-4 inline-flex h-9 items-center rounded-lg bg-[#01152d] px-3 text-xs font-semibold text-white">View options</button>
      </div>
    </div>
  )
}

function NavButton({ item, active, onClick, compact = false }: { item: { label: string; icon: typeof LayoutDashboard }; active: boolean; onClick: () => void; compact?: boolean }) {
  const Icon = item.icon
  if (compact) {
    return <button type="button" onClick={onClick} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${active ? 'bg-[#01152d] text-white' : 'bg-white text-slate-600 shadow-sm'}`}><Icon size={16} />{item.label}</button>
  }
  return <button type="button" onClick={onClick} className={`mb-1 inline-flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? 'bg-white text-[#07162d]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon size={17} />{item.label}</button>
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold tracking-normal">{title}</h2>{children}</section>
}

function CashflowChart({ data }: { data: TrendPoint[] }) {
  return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => currency.format(Number(value))} /><Area dataKey="net_cashflow" stroke="#2563eb" fill="#dbeafe" name="Net cashflow" /></AreaChart></ResponsiveContainer></div>
}

function IncomeExpenseChart({ data }: { data: TrendPoint[] }) {
  return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => currency.format(Number(value))} /><Legend /><Bar dataKey="income" fill="#059669" name="Income" /><Bar dataKey="expenses" fill="#dc2626" name="Expenses" /></BarChart></ResponsiveContainer></div>
}

function ExpensePie({ data }: { data: BreakdownPoint[] }) {
  return <div className="py-2"><ExpenseBreakdownVisual data={data} /></div>
}

function LoanProgressChart({ data }: { data: LoanProgress[] }) {
  return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis dataKey="name" type="category" width={150} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="repayment_progress" fill="#d97706" name="Repaid" /></BarChart></ResponsiveContainer></div>
}

function ModuleLayout({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#dfe8e4] bg-white shadow-sm"><div className="border-b border-[#dfe8e4] p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><h2 className="text-lg font-semibold tracking-normal text-[#07162d]">{title}</h2>{action}</div></div><div className="p-5">{children}</div></section>
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <EmptyState label="No records yet" />
  return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500">{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-medium">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-3 py-3">{cell}</td>)}</tr>)}</tbody></table></div>
}

function SmallInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <input className="h-10 min-w-36 rounded-md border border-slate-300 px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} required />
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
}

function InlineForm({ onSubmit, children }: { onSubmit: (event: FormEvent) => void; children: ReactNode }) {
  return <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">{children}</form>
}

function SubmitButton() {
  return <button className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white" type="submit"><Plus size={16} />Add</button>
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div><div className="mb-1 flex justify-between text-sm"><span className="capitalize text-slate-600">{label}</span><span className="font-medium">{value}/100</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>
}

function RiskBadge({ risk }: { risk: string }) {
  const cls = risk === 'low risk' ? 'bg-emerald-100 text-emerald-700' : risk === 'medium risk' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize ${cls}`}>{risk}</span>
}

function Insight({ title, description }: { title: string; description: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{label}</div>
}

function titleFor(view: ViewKey) {
  return navItems.find((item) => item.key === view)?.label ?? 'Dashboard'
}

function dateOnly(value?: string) {
  if (!value) return '-'
  return value.slice(0, 10)
}

export default App
