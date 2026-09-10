import { type ReactNode, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { cn } from '@/lib/cn'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  tone?: 'danger' | 'warning'
  children?: ReactNode
  busy?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'danger',
  children,
  busy = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onCancel])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
      <Card className="w-full max-w-lg space-y-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
              tone === 'danger'
                ? 'border-rose-500/20 bg-rose-500/10 text-rose-600'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-600',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight">{title}</h3>
            <p className="text-sm leading-6 text-[rgb(var(--muted))]">{description}</p>
          </div>
        </div>
        {children}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : ''}
          >
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}
