import { useEffect } from 'react'
import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { useAuth } from '@/lib/auth/auth'
import { cn } from '@/lib/cn'
import { getSidebarSections } from '@/lib/navigation'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { role } = useAuth()
  const sections = getSidebarSections(role)

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
          'fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[290px] -translate-x-full flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))]/96 p-4 shadow-soft backdrop-blur-xl transition-transform duration-300 md:translate-x-0 md:shadow-none',
          open && 'translate-x-0',
        )}
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-[rgb(var(--muted))]">
              EduTrack
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight">Ilmziyo</h2>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">Workspace shell</p>
          </div>
          <Badge variant="primary">SaaS</Badge>
        </div>

        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.32em] text-[rgb(var(--muted))]">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                          isActive
                            ? 'border-blue-500/20 bg-blue-500/10 text-blue-600'
                            : 'border-transparent text-[rgb(var(--muted))] hover:border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))]',
                        )
                      }
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.label}</span>
                        <span className="mt-1 block text-xs font-normal leading-5 opacity-80">
                          {item.description}
                        </span>
                      </span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-bold">Phase 4</p>
              <p className="text-xs leading-5 text-[rgb(var(--muted))]">
                Shell, navigation, and UX polish.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 p-0 md:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
