import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { cn } from '@/lib/cn'

type PageHeaderProps = {
  title: string
  description: string
  badge?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <section className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="space-y-3">
        {badge ? (
          <Badge variant="primary" className="w-fit">
            {badge}
          </Badge>
        ) : null}

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[rgb(var(--muted))] sm:text-base">
            {description}
          </p>
        </div>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </section>
  )
}
