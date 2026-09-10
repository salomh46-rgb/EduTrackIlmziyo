const env = import.meta.env

export const appName = env.VITE_APP_NAME?.trim() || 'EduTrackIlmziyo'

export function getSupabaseEnvironment() {
  const url = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    return null
  }

  return {
    url,
    anonKey,
  }
}

