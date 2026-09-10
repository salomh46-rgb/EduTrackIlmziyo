import { Home, Search } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { hasAnyRole } from '@/lib/auth/roles'

export function NotFoundPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, role } = useAuth()
  const authenticated = status === 'authenticated' && hasAnyRole(role, ['OWNER', 'ADMIN', 'TEACHER'])

  return (
    <StateScreen
      icon={<Search className="h-12 w-12" />}
      title="Page not found"
      description={`We could not find a page for ${location.pathname}. The shell is ready, but this route has not been implemented yet.`}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(authenticated ? '/dashboard' : '/login', { replace: true })}
          >
            <Home className="h-4 w-4" />
            {authenticated ? 'Back to dashboard' : 'Go to login'}
          </Button>
          {authenticated ? (
            <Button type="button" variant="ghost" onClick={() => navigate('/account')}>
              Open account
            </Button>
          ) : null}
        </>
      }
    />
  )
}
