import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Link as LinkIcon,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import {
  formatSom,
  generateClickPaymentLink,
  generatePaymePaymentLink,
} from '@/features/finance/services/paymentGateways'
import type { PaymentMethod, PaymentRecord, PaymentStatus } from '@/features/finance/types'

type StudentOption = {
  id: string
  name: string
  phone: string | null
  group_name: string | null
}

type NewPaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payment: PaymentRecord) => void
  onSubmitPayment: (data: {
    student_id: string
    amount: number
    payment_date: string
    due_date?: string
    status: PaymentStatus
    method: PaymentMethod
    note?: string
  }) => Promise<PaymentRecord>
  students: StudentOption[]
  organizationId: string
}

const AMOUNT_PRESETS = [300000, 450000, 600000, 800000, 1000000]

export function NewPaymentModal({
  isOpen,
  onClose,
  onSubmitPayment,
  students,
}: NewPaymentModalProps) {
  const [mode, setMode] = useState<'manual' | 'online'>('manual')
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState<number>(450000)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [status, setStatus] = useState<PaymentStatus>('PAID')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<'click' | 'payme' | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!studentId && students.length > 0) {
        setStudentId(students[0].id)
      }
      setError(null)
      setSubmitting(false)
    }
  }, [isOpen, students, studentId])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  )

  // Generated online links
  const clickLink = useMemo(() => {
    if (!studentId || !amount) return ''
    return generateClickPaymentLink({
      serviceId: '24910',
      merchantId: '16830',
      amount,
      transactionParam: studentId,
      returnUrl: window.location.origin + '/payments',
    })
  }, [studentId, amount])

  const paymeLink = useMemo(() => {
    if (!studentId || !amount) return ''
    return generatePaymePaymentLink({
      merchantId: '64e819b1828f731',
      amount,
      orderId: studentId,
      returnUrl: window.location.origin + '/payments',
    })
  }, [studentId, amount])

  if (!isOpen) return null

  const handleCopy = async (type: 'click' | 'payme', link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLink(type)
      setTimeout(() => setCopiedLink(null), 2500)
    } catch {
      // Fallback
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId) {
      setError("Iltimos, o'quvchini tanlang")
      return
    }
    if (!amount || amount <= 0) {
      setError("To'lov summasi 0 dan katta bo'lishi kerak")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onSubmitPayment({
        student_id: studentId,
        amount,
        payment_date: paymentDate,
        due_date: dueDate || undefined,
        status,
        method,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "To'lovni saqlashda xatolik yuz berdi")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-[rgb(var(--text))]">
                Yangi To'lov Qabul Qilish
              </h3>
              <p className="text-xs text-[rgb(var(--muted))]">
                Kassa orqali naqd to'lov yoki onlayn havola yaratish
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-xl p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[rgb(var(--surface-soft))] p-1.5 border border-[rgb(var(--border))]">
          <button
            type="button"
            onClick={() => {
              setMode('manual')
              if (method === 'CLICK' || method === 'PAYME') setMethod('CASH')
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
              mode === 'manual'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Kassa / Naqd to'lov
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('online')
              setMethod('CLICK')
              setStatus('PENDING')
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
              mode === 'online'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            Onlayn Havola (Click/Payme)
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Student Picker */}
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1.5">
              O'quvchi
            </label>
            <Select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="font-medium"
            >
              <option value="" disabled>
                O'quvchini tanlang...
              </option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} {st.group_name ? `(${st.group_name})` : ''}
                </option>
              ))}
            </Select>
            {selectedStudent?.phone && (
              <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
                Bog'lanish: {selectedStudent.phone}
              </p>
            )}
          </div>

          {/* Amount & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider">
                To'lov Summasi (So'mda)
              </label>
              <span className="text-xs font-black text-emerald-500">
                {formatSom(amount || 0)}
              </span>
            </div>
            <Input
              type="number"
              min={1000}
              step={1000}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Masalan: 450000"
              required
              className="text-base font-bold"
            />
            {/* Quick Presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    amount === preset
                      ? 'bg-sky-500 text-white'
                      : 'bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] border border-[rgb(var(--border))]'
                  }`}
                >
                  {formatSom(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific Fields */}
          {mode === 'manual' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1.5">
                  To'lov Usuli
                </label>
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">Naqd (Kassa)</option>
                  <option value="CLICK">Click</option>
                  <option value="PAYME">Payme</option>
                  <option value="UZUM">Uzum Bank</option>
                  <option value="BANK_TRANSFER">Bank O'tkazmasi</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1.5">
                  To'lov Holati
                </label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                >
                  <option value="PAID">To'langan (Tasdiqlangan)</option>
                  <option value="PENDING">Kutilmoqda (Qarz)</option>
                </Select>
              </div>
            </div>
          ) : (
            /* Online Link Preview Boxes */
            <div className="space-y-3 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                <Sparkles className="h-4 w-4" />
                Interaktiv To'lov Havolalari Tayyor
              </div>

              {/* Click Generator Box */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Click Checkout
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs px-2"
                      onClick={() => handleCopy('click', clickLink)}
                    >
                      {copiedLink === 'click' ? (
                        <Check className="h-3 w-3 text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedLink === 'click' ? 'Nusxalandi!' : 'Nusxa olish'}
                    </Button>
                    <a
                      href={clickLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center justify-center rounded-xl bg-sky-500/20 px-2 text-xs font-semibold text-sky-400 hover:bg-sky-500/30"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate">{clickLink}</p>
              </div>

              {/* Payme Generator Box */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Payme Checkout (Tiyin)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs px-2"
                      onClick={() => handleCopy('payme', paymeLink)}
                    >
                      {copiedLink === 'payme' ? (
                        <Check className="h-3 w-3 text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedLink === 'payme' ? 'Nusxalandi!' : 'Nusxa olish'}
                    </Button>
                    <a
                      href={paymeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center justify-center rounded-xl bg-teal-500/20 px-2 text-xs font-semibold text-teal-400 hover:bg-teal-500/30"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate">{paymeLink}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1">
                    Gateway
                  </label>
                  <Select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="CLICK">Click</option>
                    <option value="PAYME">Payme</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1">
                    Holat
                  </label>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                  >
                    <option value="PENDING">Kutilmoqda (Invoys)</option>
                    <option value="PAID">Oldindan to'langan</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1.5">
                To'lov Sanasi
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1.5">
                Muddati (Qarz bo'lsa)
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-[rgb(var(--muted))] uppercase tracking-wider mb-1.5">
              Izoh (Ixtiyoriy)
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Sentabr oyi ingliz tili to'lovi"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgb(var(--border))]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold px-5 shadow-lg shadow-sky-500/20"
            >
              {submitting
                ? 'Saqlanmoqda...'
                : mode === 'online'
                  ? 'Invoysni saqlash'
                  : "To'lovni qabul qilish"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
