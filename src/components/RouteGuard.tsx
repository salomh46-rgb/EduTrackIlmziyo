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
        title="Authentication unavailable"
        description="We could not initialize the authentication layer."
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
