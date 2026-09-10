import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { StateScreen } from '@/components/StateScreen'
import { useAuth, getAuthProblemLabel } from '@/lib/auth/auth'
import { appName } from '@/lib/env'
import { hasAnyRole } from '@/lib/auth/roles'

type LocationState = {
  reason?: string
  from?: string
}

function isEmailValid(value: string) {
  return /^\S+@\S+\.\S+$/.test(value)
}

function getFormError(email: string, password: string) {
  if (!email.trim()) {
    return 'Email is required.'
  }

  if (!isEmailValid(email.trim())) {
    return 'Enter a valid email address.'
  }

  if (!password.trim()) {
    return 'Password is required.'
  }

  return null
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status, role, signIn, problem, isSupabaseConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const state = (location.state as LocationState | null) ?? null

  const validationError = useMemo(() => {
    if (!touched) {
      return null
    }

    return getFormError(email, password)
  }, [email, password, touched])

  if (status === 'authenticated' && hasAnyRole(role, ['OWNER', 'ADMIN', 'TEACHER'])) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    const currentValidationError = getFormError(email, password)

    if (currentValidationError) {
      setFormError(currentValidationError)
      return
    }

    setFormError(null)

    setSubmitting(true)
    const result = await signIn({
      email: email.trim(),
      password,
    })
    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.message)
      return
    }

    navigate(state?.from ?? '/dashboard', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return (
      <StateScreen
        title="Authentication is not configured"
        description="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Supabase Auth. The login UI is ready, but backend credentials are still required."
      />
    )
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative flex items-center overflow-hidden px-6 py-12 sm:px-10 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-[rgb(var(--border))] to-transparent lg:block" />

        <div className="relative mx-auto max-w-xl space-y-8">
          <div className="space-y-4">
            <Badge variant="primary" className="w-fit">
              Secure access
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Welcome to {appName}
              </h1>
              <p className="max-w-lg text-sm leading-7 text-[rgb(var(--muted))] sm:text-base">
                Sign in to manage students, teachers, groups, attendance, and Telegram-backed parent
                notifications from one secure workspace.
              </p>
            </div>
          </div>

          <Card className="space-y-4 border border-[rgb(var(--border))]/80 bg-[rgb(var(--surface))]/90 backdrop-blur">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[rgb(var(--muted))]">Architecture note</p>
              <p className="text-sm leading-6 text-[rgb(var(--muted))]">
                Supabase Auth handles identity. Your profile is stored separately in the public
                `profiles` table and loaded only after the session is verified.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {['Session-aware', 'RLS-ready', 'Role-driven'].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3 text-sm font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
        <Card className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Sign in</h2>
            <p className="text-sm leading-6 text-[rgb(var(--muted))]">
              Use your organization email and password.
            </p>
          </div>

          {state?.reason === 'session-expired' ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              Your session expired. Please sign in again.
            </div>
          ) : null}

          {problem ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              {getAuthProblemLabel(problem)}
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-[rgb(var(--muted))]" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setTouched(true)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0"
                  placeholder="owner@edutrack.uz"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
                <Lock className="h-4 w-4 shrink-0 text-[rgb(var(--muted))]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched(true)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="rounded-full p-1.5 text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--text))]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {validationError ? (
              <p className="text-sm font-medium text-rose-600">{validationError}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs leading-5 text-[rgb(var(--muted))]">
            Account creation is controlled by organization owners and administrators. Public
            self-registration is disabled in this phase.
          </p>
        </Card>
      </section>
    </div>
  )
}
