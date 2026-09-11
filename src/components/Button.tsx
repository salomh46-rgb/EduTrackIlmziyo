import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | (string & {})

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-strong))] shadow-soft border-transparent',
  secondary:
    'bg-[rgb(var(--surface-soft))] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-strong))] border-[rgb(var(--border))]',
  ghost:
    'bg-transparent text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-soft))] border-transparent',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-5 py-3 text-base rounded-2xl',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-semibold transition duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))] disabled:pointer-events-none disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size] || sizeClasses.md,
        className,
      )}
      {...props}
    />
  )
}
