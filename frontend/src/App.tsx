import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileBarChart2,
  FileText,
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
  Cell,
  Legend,
  Pie,
  PieChart,
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

type ViewKey = 'dashboard' | 'transactions' | 'expenses' | 'invoices' | 'loans' | 'credit' | 'alerts' | 'reports' | 'recommendations'

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
  { key: 'invoices', label: 'Receivables', icon: FileText },
  { key: 'loans', label: 'Loans', icon: CreditCard },
  { key: 'credit', label: 'Credit Health', icon: ShieldCheck },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'reports', label: 'Reports', icon: FileBarChart2 },
  { key: 'recommendations', label: 'Recommendations', icon: Target },
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

  const query = selectedBusiness ? { business_id: selectedBusiness } : undefined

  const loadData = useCallback(async (nextBusiness = selectedBusiness) => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = nextBusiness ? { business_id: nextBusiness } : undefined
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
  }, [selectedBusiness, token])

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

  if (!token || !user) return <AuthScreen onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <Brand />
        <nav className="px-4 py-4">
          {navItems.map((item) => <NavButton key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} />)}
        </nav>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">SME Cashflow & Credit Health Assistant</p>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{titleFor(view)}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user.role !== 'sme' && (
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={selectedBusiness}
                  onChange={(event) => {
                    setSelectedBusiness(event.target.value)
                  }}
                >
                  {data.businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}
                </select>
              )}
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium" onClick={() => void loadData()} type="button">
                <RefreshCw size={16} /> Refresh
              </button>
              <button className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white" onClick={logout} type="button">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => <NavButton key={item.key} item={item} active={view === item.key} onClick={() => setView(item.key)} compact />)}
          </div>
        </header>

        <div className="px-4 py-6 lg:px-8">
          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading financial analytics...</div>}
          {view === 'dashboard' && <Dashboard data={data} />}
          {view === 'transactions' && <Transactions data={data} query={query} reload={() => loadData()} />}
          {view === 'expenses' && <Expenses data={data} />}
          {view === 'invoices' && <Invoices data={data} query={query} reload={() => loadData()} />}
          {view === 'loans' && <Loans data={data} query={query} reload={() => loadData()} />}
          {view === 'credit' && <CreditHealthView credit={data.credit} />}
          {view === 'alerts' && <AlertsView alerts={data.alerts} reload={() => loadData()} />}
          {view === 'reports' && <Reports data={data} />}
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
  const summary = data.summary
  if (!summary) return <EmptyState label="No dashboard data loaded" />
  const cards = [
    { label: 'Total income', value: currency.format(summary.total_income), icon: TrendingUp, tone: 'text-emerald-700', sub: 'All recorded income' },
    { label: 'Total expenses', value: currency.format(summary.total_expenses), icon: TrendingDown, tone: 'text-red-700', sub: 'Operating outflows' },
    { label: 'Net profit', value: currency.format(summary.net_profit), icon: CircleDollarSign, tone: 'text-blue-700', sub: 'Income less expenses' },
    { label: 'Cashflow balance', value: currency.format(summary.cashflow_balance), icon: WalletCards, tone: 'text-cyan-700', sub: 'After installments' },
    { label: 'Outstanding loans', value: currency.format(summary.outstanding_loans), icon: CreditCard, tone: 'text-amber-700', sub: 'Active obligations' },
    { label: 'Credit health', value: `${summary.credit_health_score}/100`, icon: ShieldCheck, tone: 'text-violet-700', sub: summary.risk_class },
  ]
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <MetricCard key={card.label} {...card} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <ChartPanel title="Cashflow trends"><CashflowChart data={data.trends} /></ChartPanel>
        <ChartPanel title="Expense breakdown"><ExpensePie data={data.breakdown} /></ChartPanel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Income vs expenses"><IncomeExpenseChart data={data.trends} /></ChartPanel>
        <ChartPanel title="Loan repayment progress"><LoanProgressChart data={data.loanProgress} /></ChartPanel>
      </div>
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
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <ChartPanel title="Expense mix"><ExpensePie data={data.breakdown} /></ChartPanel>
      <ModuleLayout title={`Expense ledger ${currency.format(total)}`}>
        <DataTable headers={['Date', 'Category', 'Description', 'Amount', 'Status']} rows={expenses.map((item) => [dateOnly(item.transaction_date), item.category, item.description ?? '-', currency.format(item.amount), item.status])} />
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
        <div className="mt-4 flex items-end gap-3"><span className="text-6xl font-semibold">{credit.score}</span><span className="pb-2 text-lg text-slate-500">/100</span></div>
        <RiskBadge risk={credit.risk_class} />
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
  async function toggle(alert: Alert) {
    await api.put(`/alerts/${alert.id}`, { is_read: !alert.is_read })
    reload()
  }
  return (
    <ModuleLayout title="Alerts">
      <div className="grid gap-3">
        {alerts.map((alert) => (
          <button key={alert.id} onClick={() => void toggle(alert)} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm" type="button">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3"><AlertTriangle className={alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'} size={20} /><div><h3 className="font-semibold">{alert.title}</h3><p className="mt-1 text-sm text-slate-600">{alert.message}</p></div></div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${alert.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>{alert.is_read ? 'Read' : 'New'}</span>
            </div>
          </button>
        ))}
      </div>
    </ModuleLayout>
  )
}

function Reports({ data }: { data: AppData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartPanel title="Six-month cashflow report"><CashflowChart data={data.trends} /></ChartPanel>
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
  const [form, setForm] = useState({ type: 'income', category: 'Retail sales', description: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10), status: 'cleared' })
  async function submit(event: FormEvent) {
    event.preventDefault()
    await api.post('/transactions', { ...form, amount: Number(form.amount) }, { params: query })
    setForm({ ...form, description: '', amount: '' })
    reload()
  }
  return <InlineForm onSubmit={submit}><Select value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={['income', 'expense']} /><SmallInput placeholder="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} /><SmallInput placeholder="Amount" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} type="number" /><SmallInput value={form.transaction_date} onChange={(value) => setForm({ ...form, transaction_date: value })} type="date" /><SubmitButton /></InlineForm>
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

function Brand() {
  return <div className="border-b border-slate-200 px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white"><Building2 size={22} /></div><div><p className="font-semibold">CashCred360</p><p className="text-sm text-slate-500">Banking analytics</p></div></div></div>
}

function NavButton({ item, active, onClick, compact = false }: { item: { label: string; icon: typeof LayoutDashboard }; active: boolean; onClick: () => void; compact?: boolean }) {
  const Icon = item.icon
  return <button type="button" onClick={onClick} className={`mb-1 inline-flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium ${compact ? 'shrink-0' : 'w-full'} ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={17} />{item.label}</button>
}

function MetricCard({ label, value, icon: Icon, tone, sub }: { label: string; value: string; icon: typeof TrendingUp; tone: string; sub: string }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p><p className="mt-1 text-sm text-slate-500">{sub}</p></div><Icon className={tone} size={24} /></div></section>
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold tracking-normal">{title}</h2><div className="h-80">{children}</div></section>
}

function CashflowChart({ data }: { data: TrendPoint[] }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => currency.format(Number(value))} /><Area dataKey="net_cashflow" stroke="#2563eb" fill="#dbeafe" name="Net cashflow" /></AreaChart></ResponsiveContainer>
}

function IncomeExpenseChart({ data }: { data: TrendPoint[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => currency.format(Number(value))} /><Legend /><Bar dataKey="income" fill="#059669" name="Income" /><Bar dataKey="expenses" fill="#dc2626" name="Expenses" /></BarChart></ResponsiveContainer>
}

function ExpensePie({ data }: { data: BreakdownPoint[] }) {
  return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="category" outerRadius={105} label>{data.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => currency.format(Number(value))} /><Legend /></PieChart></ResponsiveContainer>
}

function LoanProgressChart({ data }: { data: LoanProgress[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis dataKey="name" type="category" width={150} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="repayment_progress" fill="#d97706" name="Repaid" /></BarChart></ResponsiveContainer>
}

function ModuleLayout({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><h2 className="text-lg font-semibold tracking-normal">{title}</h2>{action}</div></div><div className="p-5">{children}</div></section>
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
