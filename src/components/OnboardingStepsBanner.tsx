import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Layers3,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'

type OnboardingStepsBannerProps = {
  onOpenGuide?: () => void
}

export function OnboardingStepsBanner({ onOpenGuide }: OnboardingStepsBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('edutrack_onboarding_banner_dismissed') === 'true'
    } catch {
      return false
    }
  })

  if (isDismissed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/60 px-4 py-2.5 text-xs text-[rgb(var(--muted))]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-400" />
          <span>Yangi o'quv markazni ishga tushirish qadamlari</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="font-bold text-sky-400 hover:underline"
            >
              Qo'llanmani ochish
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsDismissed(false)
              try {
                localStorage.removeItem('edutrack_onboarding_banner_dismissed')
              } catch {}
            }}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]"
          >
            Bannerni qayta ko'rsatish
          </button>
        </div>
      </div>
    )
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem('edutrack_onboarding_banner_dismissed', 'true')
    } catch {}
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface))] via-[rgb(var(--surface-soft))]/50 to-[rgb(var(--surface))] p-6 shadow-xl transition-all">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[rgb(var(--text))]">
                O'quv Markazni Sozlash: 3 Asosiy Qadam
              </h3>
              <Badge variant="primary">Boshlang'ich qo'llanma</Badge>
            </div>
            <p className="text-xs text-[rgb(var(--muted))]">
              Tizim to'liq ishlashi uchun ketma-ketlik bo'yicha ma'lumotlarni to'ldiring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onOpenGuide && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenGuide}
              className="rounded-xl text-xs font-bold"
            >
              <HelpCircle className="mr-1.5 h-3.5 w-3.5 text-sky-400" />
              Batafsil Wizard
            </Button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Yopish"
            className="rounded-xl p-1.5 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="relative mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Step 1 */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm transition hover:border-amber-500/40 hover:shadow-md">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-500">
                1-Qadam
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[rgb(var(--text))] group-hover:text-amber-500 transition">
                1. O'qituvchini kiritish ➡️
              </h4>
              <p className="mt-1 text-xs text-[rgb(var(--muted))] leading-relaxed">
                Ustozlarni ro'yxatdan o'tkazing, ularning fan mutaxassisligi va telefon raqamlarini belgilang.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link to="/teachers">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-between rounded-xl group-hover:border-amber-500/40"
              >
                <span>O'qituvchi qo'shish</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 2 */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm transition hover:border-sky-500/40 hover:shadow-md">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-400">
                2-Qadam
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <Layers3 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[rgb(var(--text))] group-hover:text-sky-400 transition">
                2. Guruh ochish ➡️
              </h4>
              <p className="mt-1 text-xs text-[rgb(var(--muted))] leading-relaxed">
                Fan nomi, oylik to'lov summasi, haftalik dars jadvali va o'qituvchini tanlab guruh yarating.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link to="/groups">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-between rounded-xl group-hover:border-sky-500/40"
              >
                <span>Guruh yaratish</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 3 */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm transition hover:border-emerald-500/40 hover:shadow-md">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
                3-Qadam
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[rgb(var(--text))] group-hover:text-emerald-500 transition">
                3. Talabalarni qo'shish ➡️
              </h4>
              <p className="mt-1 text-xs text-[rgb(var(--muted))] leading-relaxed">
                Talabalarni bittalab yoki Excel/CSV fayl orqali ommaviy yuklab oling va guruhga biriktiring.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Link to="/students">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-between rounded-xl group-hover:border-emerald-500/40"
              >
                <span>Talabalar & CSV Import</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
