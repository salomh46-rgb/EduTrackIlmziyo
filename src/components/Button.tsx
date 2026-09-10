import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-strong))] shadow-soft border-transparent',
  secondary:
    'bg-[rgb(var(--surface-soft))] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-strong))] border-[rgb(var(--border))]',
  ghost:
    'bg-transparent text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-soft))] border-transparent',
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))] disabled:pointer-events-none disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

