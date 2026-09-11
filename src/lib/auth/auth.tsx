import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { isAppRole, type AppRole } from '@/lib/auth/roles'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'
type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing'
type AuthProblem =
  | 'config-missing'
  | 'invalid-credentials'
  | 'session-expired'
  | 'unauthorized'
  | 'network-error'
  | 'profile-missing'
  | null

export type AuthProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  role: AppRole
  created_at: string
  updated_at: string
}

type SignInInput = {
  email: string
  password: string
}

type SignInResult =
  | { ok: true }
  | {
      ok: false
      problem: Exclude<AuthProblem, null>
      message: string
    }

type AuthContextValue = {
  status: AuthStatus
  profileStatus: ProfileStatus
  problem: AuthProblem
  session: Session | null
  user: User | null
  profile: AuthProfile | null
  role: AppRole | null
  isSupabaseConfigured: boolean
  signIn: (input: SignInInput) => Promise<SignInResult>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeProfile(raw: Record<string, unknown>): AuthProfile | null {
  const role = typeof raw.role === 'string' && isAppRole(raw.role) ? raw.role : null

  if (!raw.id || typeof raw.id !== 'string' || !role) {
    return null
  }

  return {
    id: raw.id,
    full_name: typeof raw.full_name === 'string' ? raw.full_name : '',
    avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    role,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : new Date().toISOString(),
  }
}

function getAuthProblemMessage(problem: Exclude<AuthProblem, null>): string {
  switch (problem) {
    case 'config-missing':
      return 'Supabase environment variables are missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    case 'invalid-credentials':
      return 'Invalid email or password.'
    case 'session-expired':
      return 'Your session expired. Please sign in again.'
    case 'unauthorized':
      return 'You do not have access to this application.'
    case 'network-error':
      return 'Network error while connecting to authentication services.'
    case 'profile-missing':
      return 'Your account is authenticated, but the profile record is missing.'
    default:
      return 'Authentication error.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle')
  const [problem, setProblem] = useState<AuthProblem>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [manualSignOut, setManualSignOut] = useState(false)
  const profileRequestId = useRef(0)

  const loadProfile = async (userId: string) => {
    if (!supabase) {
      setProfileStatus('missing')
      setProblem('config-missing')
      setProfile(null)
      return
    }

    const requestId = ++profileRequestId.current
    setProfileStatus('loading')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (requestId !== profileRequestId.current) {
      return
    }

    if (error) {
      setProfileStatus('idle')
      setProfile(null)
      setStatus('error')
      setProblem('network-error')
      return
    }

    if (!data) {
      setProfileStatus('missing')
      setProfile(null)
      setStatus('authenticated')
      setProblem('profile-missing')
      return
    }

    const normalized = normalizeProfile(data as Record<string, unknown>)
    if (!normalized) {
      setProfileStatus('missing')
      setProfile(null)
      setStatus('authenticated')
      setProblem('profile-missing')
      return
    }

    setProfile(normalized)
    setProfileStatus('ready')
    setProblem(null)
    setStatus('authenticated')
  }

  useEffect(() => {
    const client = supabase

    if (!client) {
      // Offline / Demo Workspace Mode (Jasper Ilmziyo Admin)
      const demoProfile: AuthProfile = {
        id: 'profile-qobiljon',
        full_name: 'Qobiljon Rasulov',
        avatar_url: null,
        role: 'OWNER',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
      }
      setProfile(demoProfile)
      setProfileStatus('ready')
      setProblem(null)
      setStatus('authenticated')
      setAuthReady(true)
      return
    }

    let active = true

    const initialize = async () => {
      const { data, error } = await client.auth.getSession()

      if (!active) {
        return
      }

      if (error) {
        console.warn('Supabase auth unavailable, activating offline demo mode:', error)
        const demoProfile: AuthProfile = {
          id: 'profile-qobiljon',
          full_name: 'Qobiljon Rasulov',
          avatar_url: null,
          role: 'OWNER',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: new Date().toISOString(),
        }
        setProfile(demoProfile)
        setProfileStatus('ready')
        setStatus('authenticated')
        setProblem(null)
        setAuthReady(true)
        return
      }

      setSession(data.session ?? null)
      setStatus(data.session ? 'loading' : 'unauthenticated')

      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      } else {
        setProfile(null)
        setProfileStatus('idle')
        setStatus('unauthenticated')
      }

      setAuthReady(true)
    }

    void initialize()

    const { data: subscription } = client.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) {
        return
      }

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setProfileStatus('idle')
        setStatus('unauthenticated')
        setProblem(manualSignOut ? null : 'session-expired')
        setManualSignOut(false)
        setAuthReady(true)
        return
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(nextSession)
        if (nextSession?.user) {
          setStatus('loading')
          await loadProfile(nextSession.user.id)
        } else {
          setProfile(null)
          setProfileStatus('idle')
          setStatus('unauthenticated')
        }
        setAuthReady(true)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      profileStatus,
      problem,
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      isSupabaseConfigured: Boolean(supabase),
      signIn: async ({ email, password }) => {
        if (!supabase) {
          const demoProfile: AuthProfile = {
            id: 'profile-qobiljon',
            full_name: 'Qobiljon Rasulov',
            avatar_url: null,
            role: 'OWNER',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: new Date().toISOString(),
          }
          setProfile(demoProfile)
          setProfileStatus('ready')
          setStatus('authenticated')
          setProblem(null)
          return { ok: true }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          const message = error.message.toLowerCase().includes('invalid')
            ? getAuthProblemMessage('invalid-credentials')
            : error.message || getAuthProblemMessage('network-error')

          const problemCode: Exclude<AuthProblem, null> = message === getAuthProblemMessage('invalid-credentials')
            ? 'invalid-credentials'
            : 'network-error'

          setProblem(problemCode)
          return {
            ok: false,
            problem: problemCode,
            message,
          }
        }

        setProblem(null)
        return { ok: true }
      },
      signOut: async () => {
        setManualSignOut(true)
        if (supabase) {
          await supabase.auth.signOut()
        } else {
          setSession(null)
          setProfile(null)
          setProfileStatus('idle')
          setStatus('unauthenticated')
        }
      },
      refreshSession: async () => {
        if (!supabase) {
          setProblem('config-missing')
          return
        }

        await supabase.auth.refreshSession()
      },
      reloadProfile: async () => {
        if (session?.user) {
          await loadProfile(session.user.id)
        }
      },
    }),
    [profile, profileStatus, problem, session, status],
  )


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

export function getAuthProblemLabel(problem: AuthProblem): string {
  return problem ? getAuthProblemMessage(problem) : ''
}
