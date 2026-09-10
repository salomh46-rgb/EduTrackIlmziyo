import { ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { Badge } from '@/components/Badge'

type UnauthorizedPageProps = {
  reason?: string
}

export function UnauthorizedPage({ reason }: UnauthorizedPageProps) {
  const navigate = useNavigate()
  const { role, signOut } = useAuth()

  const handleBack = () => {
    navigate('/dashboard', { replace: true })
  }

  return (
    <StateScreen
      icon={<ShieldAlert className="h-12 w-12" />}
      title="Access restricted"
      description={
        reason === 'role-mismatch'
          ? 'Your current role does not allow access to this area.'
          : 'You are signed in, but this page is not available to your account.'
      }
      actions={
        <>
          <Badge variant="primary">{role ?? 'No role'}</Badge>
          <Button type="button" variant="secondary" onClick={handleBack}>
            Back to dashboard
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </>
      }
    />
  )
}

export function RoleHint({ roleName }: { roleName?: string }) {
  return (
    <p className="text-sm text-[rgb(var(--muted))]">
      Current role: {roleName ?? 'unknown'}.
    </p>
  )
}
