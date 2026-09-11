import { type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { StateScreen } from '@/components/StateScreen'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from '@/lib/auth/auth'
import { hasAnyRole, type AppRole } from '@/lib/auth/roles'

type RequireAuthProps = {
  children?: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const { status, profileStatus, problem } = useAuth()

  if (status === 'loading' || profileStatus === 'loading') {
    return (
      <LoadingState
        title="Loading secure session"
        description="Checking your Supabase session and loading your profile before showing the application."
      />
    )
  }

  if (status === 'error') {
    return (
      <StateScreen
        title="Autentifikatsiya ulanmadi"
        description="Supabase bilan aloqa o'rnatilmadi yoki tarmoq xatosi yuz berdi. Tizimni ko'rish uchun to'g'ridan-to'g'ri Demo rejimiga o'tishingiz mumkin."
        action={
          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault()
              window.location.reload()
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-medium text-white shadow-lg transition hover:bg-sky-600 active:scale-95"
          >
            🚀 Demo Rejimida Boshlash
          </a>
        }
      />
    )
  }

  if (profileStatus === 'missing' || problem === 'profile-missing') {
    return (
      <StateScreen
        title="Profile missing"
        description="Your authentication succeeded, but the application profile record could not be found."
      />
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ reason: problem === 'session-expired' ? 'session-expired' : undefined, from: location.pathname }} />
  }

  return children ? <>{children}</> : <Outlet />
}

type RequireRoleProps = {
  allowedRoles: AppRole[]
  children: ReactNode
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { role } = useAuth()
  const location = useLocation()

  if (!hasAnyRole(role, allowedRoles)) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname, reason: 'role-mismatch' }} />
  }

  return <>{children}</>
}

type PublicOnlyProps = {
  children: ReactNode
}

export function PublicOnly({ children }: PublicOnlyProps) {
  const { status, role, profileStatus, problem } = useAuth()

  if (status === 'loading' || profileStatus === 'loading') {
    return (
      <LoadingState
        title="Loading authentication"
        description="Checking the current session before showing public authentication screens."
      />
    )
  }

  if (status === 'authenticated' && hasAnyRole(role, ['OWNER', 'ADMIN', 'TEACHER'])) {
    return <Navigate to="/dashboard" replace />
  }

  if (problem === 'profile-missing') {
    return (
      <StateScreen
        title="Profile missing"
        description="The account exists, but the profile record is incomplete."
      />
    )
  }

  return <>{children}</>
}
