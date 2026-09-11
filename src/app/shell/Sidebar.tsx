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
        {/* Luxury 2026 Brand Header with Animated Micro-SVG Logo */}
        <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-b from-[rgb(var(--surface-soft))] to-[rgb(var(--surface))] p-4 shadow-sm">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-500/15 blur-xl" />

          <div className="relative flex items-center gap-3">
            {/* Animated Micro-SVG Logo */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-sky-500/25">
              <svg className="h-7 w-7" viewBox="0 0 36 36" fill="none">
                <ellipse
                  cx="18"
                  cy="18"
                  rx="14"
                  ry="5.5"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="4 3 10 3"
                  className="animate-[spin_7s_linear_infinite]"
                  style={{ transformOrigin: '18px 18px' }}
                />
                <path
                  d="M18 9L30 15L18 21L6 15L18 9Z"
                  fill="url(#capGradSidebar)"
                  stroke="#bae6fd"
                  strokeWidth="1.2"
                />
                <path
                  d="M11 18.5V23C11 25.5 18 27 18 27C18 27 25 25.5 25 23V18.5"
                  stroke="#38bdf8"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <circle cx="18" cy="9" r="1.5" fill="#ffffff" />
                <defs>
                  <linearGradient id="capGradSidebar" x1="6" y1="9" x2="30" y2="21">
                    <stop stopColor="#38bdf8" />
                    <stop offset="1" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-[rgb(var(--muted))]">
                  EduTrack
                </p>
                <Badge variant="primary" className="text-[9px] px-1.5 py-0 font-bold">
                  2026
                </Badge>
              </div>
              <h2 className="text-base font-black tracking-tight text-[rgb(var(--text))]">
                Ilmziyo CRM
              </h2>
              <p className="text-[11px] text-[rgb(var(--muted))]">SaaS Workspace</p>
            </div>
          </div>
        </div>

        {/* Navigation items with rotating neon rim for active link */}
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
                          'group relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200',
                          isActive
                            ? 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm'
                            : 'border-transparent text-[rgb(var(--muted))] hover:border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <>
                              {/* Rotating Neon Rim (Conic beam) */}
                              <span
                                className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl p-[1px]"
                                aria-hidden="true"
                              >
                                <span className="absolute inset-[-150%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_60deg,#0ea5e9_120deg,#6366f1_180deg,#38bdf8_240deg,transparent_300deg)] opacity-75" />
                                <span className="absolute inset-[1.5px] rounded-[14.5px] bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface-soft))] opacity-95" />
                              </span>

                              {/* Left neon accent line */}
                              <span
                                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-indigo-500 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                                aria-hidden="true"
                              />
                            </>
                          ) : null}

                          <div className="relative z-10 flex w-full items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110',
                                isActive
                                  ? 'text-sky-500 shadow-sm'
                                  : 'text-[rgb(var(--muted))] group-hover:text-[rgb(var(--text))]',
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold">{item.label}</span>
                              <span className="mt-0.5 block text-xs font-normal leading-4 opacity-75">
                                {item.description}
                              </span>
                            </span>

                            {isActive ? (
                              <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-sm font-bold">Phase 5 Active</p>
              </div>
              <p className="text-xs leading-5 text-[rgb(var(--muted))]">
                PWA Engine & 2026 Elite UI live.
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
