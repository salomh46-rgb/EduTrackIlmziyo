import { Card } from '@/components/Card'

type StatCardProps = {
  label: string
  value: string
  hint: string
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[rgb(var(--muted))]">{label}</p>
          <p className="text-2xl font-extrabold tracking-tight text-[rgb(var(--text))] sm:text-[2rem]">
            {value}
          </p>
        </div>
        <p className="text-sm leading-6 text-[rgb(var(--muted))]">{hint}</p>
      </div>
    </Card>
  )
}

