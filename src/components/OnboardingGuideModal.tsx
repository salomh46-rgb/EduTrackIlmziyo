import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Layers3,
  Lightbulb,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'

export type OnboardingGuideModalProps = {
  isOpen: boolean
  onClose: () => void
}

type StepItem = {
  step: number
  title: string
  subtitle: string
  description: string
  path: string
  icon: typeof GraduationCap
  color: string
  badgeText: string
  actionLabel: string
  highlights: string[]
}

const ONBOARDING_STEPS: StepItem[] = [
  {
    step: 1,
    title: "O'qituvchini kiritish",
    subtitle: "Ustozlar jamoasini shakllantiring",
    description:
      "Har qanday o'quv markazining asosi bu o'qituvchilar. Dastlab markazda dars beradigan mutaxassislarni tizimga kiriting, ularning telefon raqami va yo'nalishlarini belgilang.",
    path: '/teachers',
    icon: GraduationCap,
    color: 'from-amber-500 to-orange-500',
    badgeText: '1-qadam (Boshlang‘ich)',
    actionLabel: "O'qituvchilar bo'limiga o'tish",
    highlights: [
      "O'qituvchining F.I.Sh va telefon raqami",
      'Mutaxassislik fani va lavozimi',
      'Tizimga kirish huquqlarini belgilash',
    ],
  },
  {
    step: 2,
    title: 'Guruh ochish',
    subtitle: "O'quv guruhlari va jadvallarni sozlang",
    description:
      "O'qituvchilar kiritilgach, yangi guruhlarni yarating. Har bir guruhga tegishli fanni, o'qituvchini, dars kunlari va oylik to'lov summasini biriktiring.",
    path: '/groups',
    icon: Layers3,
    color: 'from-sky-500 to-blue-600',
    badgeText: '2-qadam (Tuzilma)',
    actionLabel: "Guruhlar bo'limiga o'tish",
    highlights: [
      'Guruh nomi va oylik dars narxi',
      "Biriktirilgan o'qituvchi va xona",
      'Haftalik dars kunlari va soatlari',
    ],
  },
  {
    step: 3,
    title: "Talabalarni qo'shish",
    subtitle: "O'quvchilar va ota-onalarni biriktiring",
    description:
      "Guruhlar tayyor bo'lgach, talabalarni tizimga kiriting. Talabalarni bittalab qo'shish yoki tayyor Excel/CSV fayl orqali bir necha soniyada ommaviy import qilishingiz mumkin.",
    path: '/students',
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    badgeText: '3-qadam (To‘liq ishga tushirish)',
    actionLabel: "Talabalar bo'limiga o'tish",
    highlights: [
      'Talaba F.I.Sh va aloqa ma’lumotlari',
      'CSV / Excel orqali 1 daqiqada ommaviy import',
      'Ota-ona telefon raqami va Telegram bildirishnoma',
    ],
  },
]

export function OnboardingGuideModal({ isOpen, onClose }: OnboardingGuideModalProps) {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState<number>(1)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  if (!isOpen) return null

  const currentStepData = ONBOARDING_STEPS.find((s) => s.step === activeStep) || ONBOARDING_STEPS[0]

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('edutrack_onboarding_dismissed', 'true')
      } catch {
        // ignore localstorage errors
      }
    }
    onClose()
  }

  const handleNavigate = (path: string) => {
    handleClose()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl transition-all">
        {/* Top Gradient Border Beam */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[rgb(var(--border))] p-6 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-500/30 text-sky-400 shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-[rgb(var(--text))]">
                  EduTrack Tizimini Ishga Tushirish
                </h3>
                <Badge variant="primary">Onboarding Wizard</Badge>
              </div>
              <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                O'quv markaz CRM tizimidan samarali foydalanish uchun 3 ta asosiy qadam
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Yopish"
            className="rounded-xl p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Steps Navigation Pills */}
        <div className="grid grid-cols-3 gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/40 p-4">
          {ONBOARDING_STEPS.map((s) => {
            const Icon = s.icon
            const isSelected = activeStep === s.step
            const isCompleted = s.step < activeStep

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(s.step)}
                className={`relative flex flex-col items-start gap-1 rounded-2xl p-3 text-left transition-all ${
                  isSelected
                    ? 'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-md ring-2 ring-sky-500/30'
                    : 'border border-transparent hover:bg-[rgb(var(--surface-soft))]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))]'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                  </div>
                  <Icon
                    className={`h-4 w-4 ${
                      isSelected ? 'text-sky-400' : 'text-[rgb(var(--muted))]'
                    }`}
                  />
                </div>
                <div className="mt-1 font-bold text-xs text-[rgb(var(--text))] truncate w-full">
                  {s.title}
                </div>
                <div className="text-[10px] text-[rgb(var(--muted))] truncate w-full">
                  {s.subtitle}
                </div>
              </button>
            )
          })}
        </div>

        {/* Active Step Content Body */}
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/30 p-5">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant={activeStep === 1 ? 'warning' : activeStep === 2 ? 'primary' : 'success'}>
                  {currentStepData.badgeText}
                </Badge>
                <span className="text-xs text-[rgb(var(--muted))]">• Bosqich {activeStep} / 3</span>
              </div>
              <h4 className="text-lg font-black text-[rgb(var(--text))]">
                {currentStepData.title}: {currentStepData.subtitle}
              </h4>
              <p className="text-xs sm:text-sm text-[rgb(var(--muted))] leading-relaxed">
                {currentStepData.description}
              </p>

              {/* Highlights Checklist */}
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                  Ushbu bosqichda bajariladigan ishlar:
                </p>
                <div className="grid gap-2 sm:grid-cols-1">
                  {currentStepData.highlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-xs font-medium text-[rgb(var(--text))]"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Direct Action Button */}
            <div className="flex flex-col sm:items-end justify-center gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <Button
                type="button"
                onClick={() => handleNavigate(currentStepData.path)}
                className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-lg shadow-sky-500/20"
              >
                {currentStepData.actionLabel}
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
              <span className="text-[11px] text-[rgb(var(--muted))] text-center sm:text-right">
                To'g'ridan-to'g'ri bo'limga o'tish
              </span>
            </div>
          </div>

          {/* Quick Tips Section */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-amber-500">Professional Maslahat:</span>
                <p className="text-[rgb(var(--muted))] leading-relaxed">
                  Agar sizda o'quvchilar ro'yxati oldindan Excel formatida mavjud bo'lsa, ularni birma-bir kiritishingiz shart emas. 
                  <strong className="text-[rgb(var(--text))]"> Talabalar sahifasidagi "Import (CSV)"</strong> tugmasi orqali yuzlab talabalarni 1 daqiqada bazaga yuklab olishingiz mumkin!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/40 p-6 pt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-[rgb(var(--border))] text-sky-500 focus:ring-sky-500/30"
            />
            <span>Tizimga kirganda qayta ko'rsatilmasin</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveStep((prev) => prev - 1)}
              >
                Orqaga
              </Button>
            )}

            {activeStep < 3 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveStep((prev) => prev + 1)}
              >
                Keyingi qadam ({activeStep + 1}/3)
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleClose}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Tushundim, boshlaymiz!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
