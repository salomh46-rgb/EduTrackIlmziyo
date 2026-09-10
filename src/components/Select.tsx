import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--accent))] focus:bg-[rgb(var(--surface))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20',
        className,
      )}
      {...props}
    />
  )
}
