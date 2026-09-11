import { useState, useMemo } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquareText,
  Send,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Textarea } from '@/components/Textarea'
import { Select } from '@/components/Select'
import type { DebtSummary } from '@/features/finance/types'
import { formatSom } from '@/features/finance/services/paymentGateways'

type TelegramDebtorReminderModalProps = {
  isOpen: boolean
  onClose: () => void
  debtors: DebtSummary[]
  targetDebtor?: DebtSummary | null
  centerName?: string
}

type TemplatePreset = {
  id: string
  name: string
  badge: string
  template: string
}

const CURRENT_MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
]

const currentMonthName = CURRENT_MONTHS_UZ[new Date().getMonth()]

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'polite',
    name: 'Standart xushmuomala eslatma',
    badge: 'Tavsiya etiladi',
    template: `Hurmatli ota-ona! Farzandingiz {student_name}ning {month} oyi uchun ({group_name} guruhi) to'lovi {debt_amount} so'mni tashkil etmoqda. O'quv jarayoni to'xtovsiz va samarali davom etishi uchun to'lovni o'z vaqtida amalga oshirishingizni so'raymiz.\n\nHurmat bilan, {center_name} ma'muriyati.`,
  },
  {
    id: 'strict',
    name: "Muddati o'tgan / Qat'iy eslatma",
    badge: 'Kechikkanlar uchun',
    template: `DIQQAT! Hurmatli ota-ona, {student_name}ning o'quv kursi to'lovi bo'yicha {debt_amount} so'm muddati o'tgan qarzdorlik mavjud ({days_overdue} kun kechikish). Darslarga qatnashishda uzilishlar bo'lmasligi uchun to'lovni zudlik bilan amalga oshirishingizni so'raymiz.\n\nBog'lanish: {center_name}`,
  },
  {
    id: 'short',
    name: 'Qisqa eslatma (Online havola bilan)',
    badge: 'Tezkor',
    template: `Assalomu alaykum! {student_name} ({group_name}) uchun {month} oyi to'lovi: {debt_amount} so'm. To'lovni markaz kassasida yoki Click / Payme orqali qulay to'lashingiz mumkin. Rahmat! — {center_name}`,
  },
]

export function TelegramDebtorReminderModal({
  isOpen,
  onClose,
  debtors,
  targetDebtor,
  centerName = "EduTrack Ilm Ziyo",
}: TelegramDebtorReminderModalProps) {
  // If targetDebtor provided, filter to just that one, otherwise all debtors
  const activeDebtors = useMemo(() => {
    if (targetDebtor) return [targetDebtor]
    return debtors
  }, [debtors, targetDebtor])

  const [selectedPresetId, setSelectedPresetId] = useState<string>('polite')
  const [templateText, setTemplateText] = useState<string>(TEMPLATE_PRESETS[0].template)
  const [previewDebtorIndex, setPreviewDebtorIndex] = useState<number>(0)
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null)
  const [sendCompleted, setSendCompleted] = useState<boolean>(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const selectedDebtor = activeDebtors[previewDebtorIndex] || activeDebtors[0]

  const totalDebtAmount = activeDebtors.reduce((sum, d) => sum + d.total_debt, 0)
  const debtorsWithPhoneCount = activeDebtors.filter((d) => Boolean(d.phone)).length

  // Generate resolved message for a specific debtor
  const formatMessageForDebtor = (debtor: DebtSummary | undefined): string => {
    if (!debtor) return templateText
    return templateText
      .replace(/{student_name}/g, debtor.student_name)
      .replace(/{debt_amount}/g, formatSom(debtor.total_debt))
      .replace(/{group_name}/g, debtor.group_name || "Asosiy guruh")
      .replace(/{month}/g, currentMonthName)
      .replace(/{days_overdue}/g, String(debtor.days_overdue || 1))
      .replace(/{center_name}/g, centerName)
  }

  const renderedPreview = formatMessageForDebtor(selectedDebtor)

  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPresetId(preset.id)
    setTemplateText(preset.template)
  }

  const insertTag = (tag: string) => {
    setTemplateText((prev) => `${prev} ${tag}`)
  }

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(renderedPreview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleSendReminders = async () => {
    setIsSending(true)
    setSendProgress({ current: 0, total: activeDebtors.length })

    // Simulate sending batch or trigger background queue
    for (let i = 0; i < activeDebtors.length; i++) {
      await new Promise((res) => setTimeout(res, 80))
      setSendProgress({ current: i + 1, total: activeDebtors.length })
    }

    setIsSending(false)
    setSendCompleted(true)
  }

  const handleOpenDirectTelegram = () => {
    const encoded = encodeURIComponent(renderedPreview)
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl transition-all">
        {/* Top Gradient Beam */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[rgb(var(--border))] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-500/30 text-sky-400 shadow-inner">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-[rgb(var(--text))]">
                  {targetDebtor ? "Telegram Eslatma Yuborish" : "Barchasiga Telegram Eslatma Yuborish"}
                </h3>
                <Badge variant="primary">Telegram Bot & SMS</Badge>
              </div>
              <p className="text-xs text-[rgb(var(--muted))]">
                Qarzdor o'quvchilar va ularning ota-onalariga avtomatlashtirilgan to'lov eslatmalari
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            aria-label="Yopish"
            className="rounded-xl p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Summary Stats Bar */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/40 p-3">
            <span className="text-[11px] font-bold text-[rgb(var(--muted))] uppercase">Qamrov</span>
            <p className="text-base font-black text-sky-400">{activeDebtors.length} ta o'quvchi</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/40 p-3">
            <span className="text-[11px] font-bold text-[rgb(var(--muted))] uppercase">Jami Qarz</span>
            <p className="text-base font-black text-rose-500">{formatSom(totalDebtAmount)}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/40 p-3">
            <span className="text-[11px] font-bold text-[rgb(var(--muted))] uppercase">Telefon / Telegram</span>
            <p className="text-base font-black text-emerald-500">
              {debtorsWithPhoneCount} ta aloqa tayyor
            </p>
          </div>
        </div>

        {/* Success Screen */}
        {sendCompleted ? (
          <div className="my-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-lg">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-[rgb(var(--text))]">
                Eslatmalar Muvaffaqiyatli Yuborildi!
              </h4>
              <p className="text-xs text-[rgb(var(--muted))] max-w-md">
                Jami {activeDebtors.length} ta qarzdor o'quvchining ota-onalariga shablon asosida
                to'lov eslatmalari jo'natildi va tizim xabarnomalar jurnaliga qayd etildi.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Button type="button" onClick={onClose} className="rounded-xl font-bold">
                Yopish
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Step 1: Template Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                1. Tayyor Shablon Tanlang:
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {TEMPLATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                      selectedPresetId === preset.id
                        ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                        : 'border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/30 hover:bg-[rgb(var(--surface-soft))]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold text-[rgb(var(--text))]">
                        {preset.name}
                      </span>
                      {selectedPresetId === preset.id && (
                        <Check className="h-3.5 w-3.5 text-sky-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-sky-400 font-medium">
                      {preset.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Template Editor & Dynamic Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                  2. Matnni Tahrirlash va O'zgaruvchilar:
                </label>
              </div>

              {/* Dynamic tag buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { tag: '{student_name}', label: 'Talaba ismi' },
                  { tag: '{debt_amount}', label: 'Qarz summasi' },
                  { tag: '{group_name}', label: 'Guruh nomi' },
                  { tag: '{month}', label: 'Joriy oy' },
                  { tag: '{days_overdue}', label: 'Kechikish (kun)' },
                  { tag: '{center_name}', label: 'Markaz nomi' },
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag(tag)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-2.5 py-1 text-[11px] font-bold text-[rgb(var(--text))] hover:border-sky-500/50 hover:text-sky-400 transition"
                  >
                    <Sparkles className="h-3 w-3 text-sky-400" />
                    <span>{label}</span>
                    <code className="text-[10px] text-[rgb(var(--muted))]">{tag}</code>
                  </button>
                ))}
              </div>

              <Textarea
                rows={4}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                className="w-full text-xs font-medium leading-relaxed"
                placeholder="Xabar matnini kiriting..."
              />
            </div>

            {/* Step 3: Telegram Bubble Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                  <MessageSquareText className="h-4 w-4 text-sky-400" />
                  Jonli Ko'rinish (Telegram Live Preview):
                </label>

                {activeDebtors.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[rgb(var(--muted))]">Namunaviy o'quvchi:</span>
                    <select
                      value={previewDebtorIndex}
                      onChange={(e) => setPreviewDebtorIndex(Number(e.target.value))}
                      className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-2 py-1 text-xs font-bold text-[rgb(var(--text))]"
                    >
                      {activeDebtors.slice(0, 10).map((d, i) => (
                        <option key={d.student_id} value={i}>
                          {d.student_name} ({formatSom(d.total_debt)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Realistic Telegram Message Bubble */}
              <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#17212b] to-[#0e1621] p-4 text-white shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-[11px] text-sky-300 font-semibold">
                  <span>Telegram Bot Bildirishnomasi</span>
                  <span>{selectedDebtor?.phone ?? 'Telefon raqam ko‘rsatilmagan'}</span>
                </div>
                <div className="whitespace-pre-wrap text-xs sm:text-sm font-normal text-slate-100 leading-relaxed">
                  {renderedPreview}
                </div>
                <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-sky-400 font-bold">✓✓</span>
                </div>
              </div>
            </div>

            {/* Progress indicator during sending */}
            {isSending && sendProgress && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold text-[rgb(var(--text))]">
                  <span>Xabarlar Telegram orqali yuborilmoqda...</span>
                  <span>
                    {sendProgress.current} / {sendProgress.total} (
                    {Math.round((sendProgress.current / sendProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--surface-soft))]">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500 transition-all duration-150"
                    style={{
                      width: `${(sendProgress.current / sendProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        {!sendCompleted && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyPreview}
                className="rounded-xl text-xs"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                    Nusxalandi!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Matnni nusxalash
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenDirectTelegram}
                className="rounded-xl text-xs text-sky-400 hover:text-sky-300"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Telegramda ochish
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSending}
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                onClick={handleSendReminders}
                disabled={isSending || activeDebtors.length === 0}
                className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-lg shadow-sky-500/20"
              >
                <Send className="mr-2 h-4 w-4" />
                {targetDebtor
                  ? "Eslatma Yuborish"
                  : `Barcha ${activeDebtors.length} ta Qarzdorga Yuborish`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
