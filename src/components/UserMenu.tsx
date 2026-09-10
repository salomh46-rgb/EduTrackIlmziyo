import { ChevronDown, LogOut, Settings2, UserCircle2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth/auth'
import { can } from '@/lib/auth/roles'
import { cn } from '@/lib/cn'

export function UserMenu() {
  const navigate = useNavigate()
  const { profile, role, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const displayName = profile?.full_name?.trim() || 'Unassigned user'

  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean)
    if (parts.length === 0) {
      return 'U'
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }, [displayName])

  const handleLogout = async () => {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 min-w-[12rem] justify-between gap-3 rounded-3xl px-3 py-2"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/12 text-sm font-black text-blue-600">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              initials
            )}
          </span>
          <span className="hidden min-w-0 flex-col items-start sm:flex">
            <span className="truncate text-sm font-bold text-[rgb(var(--text))]">{displayName}</span>
            <span className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
              <UserCircle2 className="h-3.5 w-3.5" />
              {role ?? 'No role'}
            </span>
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </Button>

      <div
        className={cn(
          'absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(92vw,20rem)] rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-soft transition',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
        )}
      >
        <div className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/12 text-sm font-black text-blue-600">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{displayName}</p>
              <Badge variant="primary" className="mt-1">
                {role ?? 'Unassigned'}
              </Badge>
            </div>
          </div>
          <p className="text-xs leading-5 text-[rgb(var(--muted))]">
            Authenticated via Supabase. Profile data is loaded from the public `profiles` table.
          </p>
        </div>

        <div className="mt-3 space-y-1">
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-[rgb(var(--surface-soft))]"
          >
            <UserCircle2 className="h-4 w-4" />
            Account
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-[rgb(var(--surface-soft))]',
              can(role, 'settings:view') ? '' : 'text-[rgb(var(--muted))]',
            )}
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
