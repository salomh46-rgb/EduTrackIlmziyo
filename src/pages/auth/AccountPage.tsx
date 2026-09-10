import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/lib/auth/auth'

export function AccountPage() {
  const { profile, role, session } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Account"
        title="Profile and session"
        description="This page confirms the current session, loaded profile, and role that powers access control throughout the app."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="space-y-2 text-sm text-[rgb(var(--muted))]">
            <p>
              Name: <span className="font-semibold text-[rgb(var(--text))]">{profile?.full_name || 'Unknown'}</span>
            </p>
            <p>
              Role: <span className="font-semibold text-[rgb(var(--text))]">{role ?? 'Unassigned'}</span>
            </p>
            <p>
              Avatar: <span className="font-semibold text-[rgb(var(--text))]">{profile?.avatar_url ? 'Configured' : 'Not set'}</span>
            </p>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold">Session</h2>
          <div className="space-y-2 text-sm text-[rgb(var(--muted))]">
            <p>
              Authenticated user ID: <span className="font-semibold text-[rgb(var(--text))]">{session?.user.id ?? 'None'}</span>
            </p>
            <p>
              Email: <span className="font-semibold text-[rgb(var(--text))]">{session?.user.email ?? 'None'}</span>
            </p>
            <p>
              Supabase access token: <span className="font-semibold text-[rgb(var(--text))]">{session ? 'Present' : 'Missing'}</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
