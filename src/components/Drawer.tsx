import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/Button'
import { cn } from '@/lib/cn'

type DrawerProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Drawer({ open, title, description, onClose, children, footer, className }: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl translate-x-full flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-soft transition-transform duration-300',
          open && 'translate-x-0',
          className,
        )}
        aria-modal="true"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] px-5 py-5 sm:px-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black tracking-tight">{title}</h2>
            {description ? <p className="text-sm leading-6 text-[rgb(var(--muted))]">{description}</p> : null}
          </div>
          <Button type="button" variant="secondary" className="h-10 w-10 p-0" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer ? <div className="border-t border-[rgb(var(--border))] px-5 py-4 sm:px-6">{footer}</div> : null}
      </aside>
    </>
  )
}
