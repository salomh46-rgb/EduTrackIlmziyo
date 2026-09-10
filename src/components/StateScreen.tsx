import type { ReactNode } from 'react'
import { Card } from '@/components/Card'
import { cn } from '@/lib/cn'

type StateScreenProps = {
  title: string
  description: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function StateScreen({ title, description, icon, actions, className }: StateScreenProps) {
  return (
    <div className={cn('grid min-h-[calc(100vh-2rem)] place-items-center px-4 py-10', className)}>
      <Card className="w-full max-w-xl space-y-6 text-center">
        {icon ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-[rgb(var(--primary))]">
            {icon}
          </div>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="text-sm leading-6 text-[rgb(var(--muted))]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap justify-center gap-3">{actions}</div> : null}
      </Card>
    </div>
  )
}
