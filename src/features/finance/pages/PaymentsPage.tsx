import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Filter,
  Layers,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/Select'
import { StatCard } from '@/components/StatCard'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import {
  createPayment,
  getFinanceOverview,
  listDebtors,
  listPayments,
  listStudentsForPayment,
} from '@/features/finance/api/financeApi'
import { formatSom } from '@/features/finance/services/paymentGateways'
import type {
  DebtSummary,
  FinanceStats,
  PaymentFilter,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
} from '@/features/finance/types'
import { PaymentReceiptModal } from '@/features/finance/components/PaymentReceiptModal'
import { NewPaymentModal } from '@/features/finance/components/NewPaymentModal'

type TabType = 'all' | 'debtors' | 'analytics'

type PaymentsPageProps = {
  initialTab?: TabType
}

export function PaymentsPage({ initialTab = 'all' }: PaymentsPageProps) {
  const { profile } = useAuth()
  const { organization, loading: orgLoading } = useWorkspaceOrganization()

  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [debtors, setDebtors] = useState<DebtSummary[]>([])
  const [overview, setOverview] = useState<FinanceStats | null>(null)
  const [studentsList, setStudentsList] = useState<
    Array<{ id: string; name: string; phone: string | null; group_name: string | null }>
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters for payments table
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals state
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null)
  const [newPaymentOpen, setNewPaymentOpen] = useState(false)
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | null>(null)

  // Load finance data
  const loadFinanceData = async () => {
    if (!organization?.id) return
    setLoading(true)
    setError(null)

    try {
      const [paymentsRes, debtorsRes, overviewRes, studentsRes] = await Promise.all([
        listPayments(organization.id, {
          status: statusFilter,
          method: methodFilter,
          search,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          pageSize: 100,
        }),
        listDebtors(organization.id),
        getFinanceOverview(organization.id),
        listStudentsForPayment(organization.id),
      ])

      setPayments(paymentsRes.rows)
      setDebtors(debtorsRes)
      setOverview(overviewRes)
      setStudentsList(studentsRes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Moliya ma'lumotlarini yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFinanceData()
  }, [organization?.id, statusFilter, methodFilter, startDate, endDate])

  // Filtered payments in memory for instant search feedback
  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments
    const s = search.trim().toLowerCase()
    return payments.filter((item) => {
      const stName = item.student
        ? `${item.student.first_name} ${item.student.last_name}`.toLowerCase()
        : ''
      const phone = item.student?.phone?.toLowerCase() ?? ''
      const receipt = item.receipt_number.toLowerCase()
      const note = item.note?.toLowerCase() ?? ''
      return stName.includes(s) || phone.includes(s) || receipt.includes(s) || note.includes(s)
    })
  }, [payments, search])

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return

    const headers = [
      'Kvitansiya',
      'Tranzaksiya_ID',
      'Oquvchi',
      'Telefon',
      'Guruh',
      'Summa_Som',
      'Usul',
      'Holat',
      'Sana',
      'Izoh',
    ]

    const rows = filteredPayments.map((p) => [
      p.receipt_number,
      p.transaction_id,
      p.student ? `${p.student.first_name} ${p.student.last_name}` : '',
      p.student?.phone ?? '',
      p.student?.group_name ?? '',
      p.amount,
      p.method,
      p.status,
      p.payment_date ?? '',
      p.note ? `"${p.note.replace(/"/g, '""')}"` : '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `EduTrack_Toluvlar_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRecordPayment = async (data: {
    student_id: string
    amount: number
    payment_date: string
    due_date?: string
    status: PaymentStatus
    method: PaymentMethod
    note?: string
  }) => {
    if (!organization?.id) throw new Error('Tashkilot aniqlanmadi')

    const created = await createPayment(organization.id, data, profile?.id)
    await loadFinanceData()
    setReceiptPayment(created)
    return created
  }

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">To'langan</Badge>
      case 'PENDING':
        return <Badge variant="warning">Kutilmoqda</Badge>
      case 'OVERDUE':
        return <Badge variant="danger">Muddati o'tgan</Badge>
      case 'FAILED':
        return <Badge variant="danger">Xatolik</Badge>
      case 'REFUNDED':
        return <Badge variant="neutral">Qaytarilgan</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'CLICK':
        return (
          <span className="inline-flex items-center rounded-lg bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400">
            Click
          </span>
        )
      case 'PAYME':
        return (
          <span className="inline-flex items-center rounded-lg bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-xs font-bold text-teal-400">
            Payme
          </span>
        )
      case 'UZUM':
        return (
          <span className="inline-flex items-center rounded-lg bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-400">
            Uzum
          </span>
        )
      case 'CASH':
        return (
          <span className="inline-flex items-center rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
            Naqd
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-lg bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-xs font-bold text-slate-300">
            {method}
          </span>
        )
    }
  }

  if (orgLoading) {
    return <LoadingState title="Tashkilot yuklanmoqda..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Moliya va To'lovlar"
        description="O'quvchilar to'lovlari, qarzdorlik tahlili va to'lov tizimlari integratsiyasi"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={handleExportCSV}
              disabled={payments.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Eksport (CSV)
            </Button>
            <Button
              type="button"
              onClick={() => {
                setSelectedStudentForPayment(null)
                setNewPaymentOpen(true)
              }}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-lg shadow-sky-500/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yangi To'lov Qabul Qilish
            </Button>
          </div>
        }
      />

      {/* Top 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Oylik Tushum"
          value={formatSom(overview?.total_collected_month ?? 0)}
          hint="Joriy oydagi tasdiqlangan to'lovlar"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        />
        <StatCard
          label="Kutilayotgan To'lovlar"
          value={formatSom(overview?.pending_amount ?? 0)}
          hint="To'lanishi kutilayotgan invoyslar"
          icon={<Clock className="h-5 w-5 text-amber-400" />}
        />
        <StatCard
          label="Qarzdorlar Soni"
          value={`${overview?.overdue_debtors_count ?? debtors.length} ta`}
          hint="To'lov muddati o'tgan o'quvchilar"
          icon={<ShieldAlert className="h-5 w-5 text-rose-400" />}
        />
        <StatCard
          label="Tranzaksiyalar"
          value={`${overview?.total_transactions_count ?? payments.length} ta`}
          hint="Umumiy kassa yozuvlari"
          icon={<Wallet className="h-5 w-5 text-sky-400" />}
        />
      </div>

      {/* Main Tabs Control */}
      <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
            activeTab === 'all'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))]'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Barcha To'lovlar ({payments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debtors')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
            activeTab === 'debtors'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))]'
          }`}
        >
          <Users className="h-4 w-4" />
          Qarzdorlar Ro'yxati ({debtors.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
              : 'text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          To'lov Tahlili (Analytics)
        </button>
      </div>

      {/* Tab 1: All Payments */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters Row */}
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[rgb(var(--muted))]" />
                <Input
                  type="text"
                  placeholder="Ism, telefon, kvitansiya..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'ALL')}
              >
                <option value="ALL">Barcha holatlar</option>
                <option value="PAID">To'langan</option>
                <option value="PENDING">Kutilmoqda</option>
                <option value="OVERDUE">Muddati o'tgan</option>
                <option value="REFUNDED">Qaytarilgan</option>
              </Select>

              {/* Method Filter */}
              <Select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'ALL')}
              >
                <option value="ALL">Barcha usullar</option>
                <option value="CASH">Naqd (Kassa)</option>
                <option value="CLICK">Click</option>
                <option value="PAYME">Payme</option>
                <option value="UZUM">Uzum</option>
                <option value="BANK_TRANSFER">Bank o'tkazmasi</option>
              </Select>

              {/* Start Date */}
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Boshlanish"
              />

              {/* End Date */}
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Tugash"
              />
            </div>
          </Card>

          {/* Payments Table */}
          {loading ? (
            <LoadingState title="To'lovlar yuklanmoqda..." />
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              title="To'lovlar topilmadi"
              description="Kiritilgan filterlar bo'yicha hech qanday to'lov mavjud emas."
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-xs uppercase font-bold text-[rgb(var(--muted))] tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Kvitansiya №</th>
                      <th className="px-5 py-3.5">O'quvchi</th>
                      <th className="px-5 py-3.5">Summa</th>
                      <th className="px-5 py-3.5">To'lov Usuli</th>
                      <th className="px-5 py-3.5">Sana</th>
                      <th className="px-5 py-3.5">Holat</th>
                      <th className="px-5 py-3.5 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))] text-[rgb(var(--text))]">
                    {filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-[rgb(var(--surface-soft))]/50 transition group"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-xs text-sky-400">
                          {payment.receipt_number}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold">
                            {payment.student
                              ? `${payment.student.first_name} ${payment.student.last_name}`
                              : "Noma'lum o'quvchi"}
                          </div>
                          <div className="text-xs text-[rgb(var(--muted))]">
                            {payment.student?.group_name ?? "Guruh yo'q"}
                            {payment.student?.phone ? ` • ${payment.student.phone}` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-black text-emerald-500">
                          {formatSom(payment.amount)}
                        </td>
                        <td className="px-5 py-4">{getMethodBadge(payment.method)}</td>
                        <td className="px-5 py-4 text-xs font-medium text-[rgb(var(--muted))]">
                          {payment.payment_date ?? payment.created_at.slice(0, 10)}
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(payment.status)}</td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setReceiptPayment(payment)}
                            className="rounded-xl hover:border-sky-500/50 hover:text-sky-400"
                          >
                            <Receipt className="mr-1.5 h-3.5 w-3.5" />
                            Kvitansiya
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Debtors List */}
      {activeTab === 'debtors' && (
        <div className="space-y-4">
          <Card className="p-4 bg-rose-500/5 border-rose-500/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
              <p className="text-xs text-rose-400 font-medium">
                Ushbu ro'yxatda to'lov muddati o'tgan yoki to'lanmagan qarzdorlikka ega bo'lgan
                o'quvchilar jamlangan. Siz ularga to'lov havolasini yuborishingiz yoki kassaga to'lov
                qabul qilishingiz mumkin.
              </p>
            </div>
          </Card>

          {loading ? (
            <LoadingState title="Qarzdorlar yuklanmoqda..." />
          ) : debtors.length === 0 ? (
            <EmptyState
              title="Qarzdorlar yo'q!"
              description="Barcha o'quvchilar to'lovlarini o'z vaqtida amalga oshirgan."
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-xs uppercase font-bold text-[rgb(var(--muted))] tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">O'quvchi F.I.Sh</th>
                      <th className="px-5 py-3.5">Guruh</th>
                      <th className="px-5 py-3.5">Telefon</th>
                      <th className="px-5 py-3.5">Jami Qarz</th>
                      <th className="px-5 py-3.5">Holat & Kechikish</th>
                      <th className="px-5 py-3.5 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))] text-[rgb(var(--text))]">
                    {debtors.map((debtor) => (
                      <tr
                        key={debtor.student_id}
                        className="hover:bg-[rgb(var(--surface-soft))]/50 transition"
                      >
                        <td className="px-5 py-4 font-bold">{debtor.student_name}</td>
                        <td className="px-5 py-4 text-xs font-medium text-[rgb(var(--muted))]">
                          {debtor.group_name ?? "Guruh yo'q"}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-[rgb(var(--text))]">
                          {debtor.phone ?? '—'}
                        </td>
                        <td className="px-5 py-4 font-black text-rose-500">
                          {formatSom(debtor.total_debt)}
                        </td>
                        <td className="px-5 py-4">
                          {debtor.days_overdue > 0 ? (
                            <span className="inline-flex items-center rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-400">
                              {debtor.days_overdue} kun kechikkan
                            </span>
                          ) : (
                            <Badge variant="warning">Kutilmoqda</Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedStudentForPayment(debtor.student_id)
                              setNewPaymentOpen(true)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                          >
                            To'lov qilish
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Payment Methods Breakdown */}
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-sky-400" />
                To'lov Tizimlari Taqsimoti
              </h3>
              <p className="text-xs text-[rgb(var(--muted))]">
                O'quvchilar qaysi to'lov usullaridan ko'proq foydalanmoqda
              </p>

              <div className="space-y-3 pt-2">
                {overview &&
                  Object.entries(overview.payment_methods_breakdown).map(([method, amount]) => {
                    const total = Object.values(overview.payment_methods_breakdown).reduce(
                      (a, b) => a + b,
                      0,
                    )
                    const percent = total > 0 ? Math.round((amount / total) * 100) : 0

                    return (
                      <div key={method} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{method}</span>
                          <span className="text-emerald-400">
                            {formatSom(amount)} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[rgb(var(--surface-soft))] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Card>

            {/* Monthly Trends */}
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-400" />
                Oylik Tushum Dinamikasi
              </h3>
              <p className="text-xs text-[rgb(var(--muted))]">
                Oxirgi 6 oylik to'lovlar statistikasi
              </p>

              <div className="space-y-3 pt-2">
                {overview?.monthly_trend.map((m) => {
                  const maxVal = Math.max(
                    ...overview.monthly_trend.map((x) => x.amount),
                    1000000,
                  )
                  const percent = Math.round((m.amount / maxVal) * 100)

                  return (
                    <div key={m.month} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="capitalize">{m.month}</span>
                        <span className="text-sky-400">
                          {formatSom(m.amount)} ({m.count} ta to'lov)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[rgb(var(--surface-soft))] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percent, 4)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Luxury 2026 Digital Receipt Modal */}
      <PaymentReceiptModal
        payment={receiptPayment}
        organizationName={organization?.name ?? 'EduTrack Ilmziyo'}
        isOpen={Boolean(receiptPayment)}
        onClose={() => setReceiptPayment(null)}
      />

      {/* New Payment Modal */}
      <NewPaymentModal
        isOpen={newPaymentOpen}
        onClose={() => {
          setNewPaymentOpen(false)
          setSelectedStudentForPayment(null)
        }}
        onSuccess={() => {
          setNewPaymentOpen(false)
        }}
        onSubmitPayment={handleRecordPayment}
        students={studentsList}
        organizationId={organization?.id ?? ''}
      />
    </div>
  )
}
