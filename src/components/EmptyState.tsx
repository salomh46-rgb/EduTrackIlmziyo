import { type ReactNode } from 'react'
import { Card } from '@/components/Card'
import { cn } from '@/lib/cn'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <Card className={cn('flex h-full flex-col items-start justify-between gap-4', className)}>
      <div className="space-y-3">
        {icon ? <div className="text-[rgb(var(--primary))]">{icon}</div> : null}
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--muted))]">{description}</p>
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </Card>
  )
}

