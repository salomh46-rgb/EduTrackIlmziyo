import type { HTMLAttributes, MouseEvent } from 'react'
import { cn } from '@/lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean
  spotlight?: boolean
}

export function Card({ className, padded = true, spotlight = true, onMouseMove, ...props }: CardProps) {
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (spotlight) {
      const rect = e.currentTarget.getBoundingClientRect()
      e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }
    onMouseMove?.(e)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-soft transition-all duration-300 hover:border-sky-500/40 hover:shadow-lg',
        spotlight && 'before:pointer-events-none before:absolute before:-inset-px before:rounded-[inherit] before:opacity-0 before:transition-opacity before:duration-300 before:bg-[radial-gradient(350px_circle_at_var(--mouse-x,0px)_var(--mouse-y,0px),rgba(56,189,248,0.12),transparent_80%)] group-hover:before:opacity-100',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    />
  )
}

