import { useEffect, useRef } from 'react'
import { CheckCircle2, Download, Printer, QrCode, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { formatSom } from '@/features/finance/services/paymentGateways'
import type { PaymentRecord } from '@/features/finance/types'

type PaymentReceiptModalProps = {
  payment: PaymentRecord | null
  organizationName?: string
  isOpen: boolean
  onClose: () => void
}

export function PaymentReceiptModal({
  payment,
  organizationName = 'EduTrack Ilmziyo',
  isOpen,
  onClose,
}: PaymentReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = origOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !payment) {
    return null
  }

  const studentName = payment.student
    ? `${payment.student.first_name} ${payment.student.last_name}`
    : "O'quvchi"
  const groupLabel = payment.student?.group_name
    ? `${payment.student.group_name}${payment.student.group_subject ? ` (${payment.student.group_subject})` : ''}`
    : 'Umumiy guruh'

  const formattedDate = payment.payment_date
    ? new Intl.DateTimeFormat('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      }).format(new Date(payment.payment_date))
    : new Intl.DateTimeFormat('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      }).format(new Date(payment.created_at))

  const formattedTime = new Intl.DateTimeFormat('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(payment.created_at))

  const handlePrint = () => {
    window.print()
  }

  const isPaid = payment.status === 'PAID'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm print:p-0 print:bg-white">
      <div
        ref={receiptRef}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 text-slate-100 shadow-2xl transition-all duration-300 print:max-w-none print:rounded-none print:border-none print:bg-white print:p-8 print:text-black"
      >
        {/* Decorative Top Accent Light */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 print:hidden" />

        {/* Close Button (Hidden in Print) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white print:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center pt-2 pb-4 border-b border-dashed border-slate-800 print:border-slate-300">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 print:bg-slate-100 print:text-slate-800">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white print:text-black">
            {organizationName}
          </h2>
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mt-0.5">
            Rasmiy To'lov Kvitansiyasi
          </p>
        </div>

        {/* Amount Hero Section */}
        <div className="my-5 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80 text-center relative overflow-hidden print:bg-slate-50 print:border-slate-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 print:text-slate-600">
            To'lov Miqdori
          </span>
          <div className="text-3xl font-black tracking-tight text-emerald-400 print:text-emerald-700 mt-1">
            {formatSom(payment.amount)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 print:text-slate-600">
            ({payment.amount_in_tiyin.toLocaleString('uz-UZ')} tiyin)
          </div>

          {/* Status Watermark Stamp */}
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 print:border-emerald-700 print:text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isPaid ? "✅ TO'LANGAN (TASDIQLANGAN)" : `HOLAT: ${payment.status}`}
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="space-y-3 text-sm border-b border-dashed border-slate-800 pb-5 print:border-slate-300 print:text-slate-900">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Kvitansiya №:</span>
            <span className="font-mono font-bold text-white tracking-wider print:text-black">
              {payment.receipt_number}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Tranzaksiya ID:</span>
            <span className="font-mono text-xs text-slate-300 print:text-slate-700">
              {payment.transaction_id}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Sana va vaqt:</span>
            <span className="font-medium text-slate-200 print:text-black">
              {formattedDate}, {formattedTime}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">O'quvchi F.I.Sh:</span>
            <span className="font-bold text-white print:text-black">{studentName}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Guruh / Fan:</span>
            <span className="font-medium text-slate-200 print:text-black">{groupLabel}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">To'lov usuli:</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-0.5 font-semibold text-xs text-sky-400 print:bg-slate-200 print:text-black">
              {payment.method}
            </span>
          </div>

          {payment.note && (
            <div className="flex justify-between items-start pt-1">
              <span className="text-xs text-slate-400">Izoh:</span>
              <span className="text-xs text-slate-300 max-w-[200px] text-right italic print:text-slate-700">
                {payment.note}
              </span>
            </div>
          )}
        </div>

        {/* Barcode & Security QR Visual */}
        <div className="pt-4 flex items-center justify-between">
          {/* Simulated Barcode */}
          <div className="space-y-1">
            <div className="flex h-9 items-end gap-1 px-1">
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1].map((w, idx) => (
                <div
                  key={idx}
                  className="bg-slate-300 print:bg-black rounded-sm"
                  style={{ width: `${w * 1.5}px`, height: '100%' }}
                />
              ))}
            </div>
            <div className="text-[10px] font-mono text-slate-500 text-center tracking-widest">
              {payment.receipt_number}
            </div>
          </div>

          {/* QR Code Decorator */}
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white p-1 shadow-md">
              <QrCode className="h-12 w-12 text-slate-900" />
            </div>
            <span className="text-[9px] text-slate-400 mt-1 font-mono">ONLAYN TEKSHIRUV</span>
          </div>
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="mt-6 flex items-center gap-3 print:hidden">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Chop etish
          </Button>
          <Button
            type="button"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
            onClick={handlePrint}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF Saqlash
          </Button>
        </div>
      </div>
    </div>
  )
}
