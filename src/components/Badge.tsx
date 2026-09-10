import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const badgeClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))] border-[rgb(var(--border))]',
  primary: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide',
        badgeClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
