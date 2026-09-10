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
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[rgb(var(--muted))]">
            {appName}
          </p>
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

        <label className="hidden min-w-[240px] max-w-md flex-1 items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--muted))] shadow-sm lg:flex">
          <Search className="h-4 w-4 shrink-0" />
          <Input
            className="!h-auto !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
            placeholder="Search students, parents, groups, lessons..."
            aria-label="Global search"
          />
        </label>

        <ThemeToggle />

        <Button type="button" variant="secondary" className="relative">
          <BellRing className="h-4 w-4" />
          <Badge variant="danger" className="absolute -right-1 -top-1 px-1.5 py-0.5 text-[10px]">
            3
          </Badge>
        </Button>

        <UserMenu />
      </div>
    </header>
  )
}
