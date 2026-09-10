import type { ReactNode } from 'react'
import { Card } from '@/components/Card'

type StatCardProps = {
  label: string
  value: string
  hint: string
  icon?: ReactNode
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))]">{label}</p>
            <p className="text-2xl font-black tracking-tight text-[rgb(var(--text))] sm:text-[2rem]">
              {value}
            </p>
          </div>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm transition-transform duration-300 group-hover:scale-110">
              {icon}
            </div>
          )}
        </div>
        <p className="text-xs font-medium leading-relaxed text-[rgb(var(--muted))]">{hint}</p>
      </div>
    </Card>
  )
}

