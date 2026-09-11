import { BellRing, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Input } from '@/components/Input'
import { ThemeToggle } from '@/components/ThemeToggle'
import { appName } from '@/lib/env'
import { UserMenu } from '@/components/UserMenu'
import { getRouteSection, getRouteTitle } from '@/lib/navigation'

type TopbarProps = {
  onOpenSidebar: () => void
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const location = useLocation()
  const routeTitle = getRouteTitle(location.pathname)
  const routeSection = getRouteSection(location.pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))]/85 backdrop-blur-xl">
      <div className="flex min-h-[4.75rem] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Button type="button" variant="secondary" className="md:hidden" onClick={onOpenSidebar}>
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[rgb(var(--muted))]">
              {appName}
            </p>
            {/* Pulsing status dot for live sync */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm"
              title="Real-time tizim sinxronizatsiyasi faol"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="tracking-wide font-bold">LIVE SYNC</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-lg font-black tracking-tight text-[rgb(var(--text))]">
              {routeTitle}
            </span>
            {routeSection ? (
              <>
                <span className="text-[rgb(var(--muted))]/60">/</span>
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--muted))]">
                  {routeSection}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <label className="hidden min-w-[240px] max-w-md flex-1 items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--muted))] shadow-sm transition focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/20 lg:flex">
          <Search className="h-4 w-4 shrink-0 text-sky-500" />
          <Input
            className="!h-auto !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
            placeholder="Search students, parents, groups, lessons..."
            aria-label="Global search"
          />
        </label>

        <ThemeToggle />

        <Button type="button" variant="secondary" className="relative group">
          <BellRing className="h-4 w-4 transition group-hover:rotate-12 text-[rgb(var(--muted))] group-hover:text-[rgb(var(--text))]" />
          <Badge variant="danger" className="absolute -right-1 -top-1 px-1.5 py-0.5 text-[10px] animate-pulse">
            3
          </Badge>
        </Button>

        <UserMenu />
      </div>
    </header>
  )
}
