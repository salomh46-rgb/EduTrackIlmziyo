import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnvironment } from '@/lib/env'

const supabaseEnv = getSupabaseEnvironment()

export const supabase: SupabaseClient | null = supabaseEnv
  ? createClient(supabaseEnv.url, supabaseEnv.anonKey)
  : null

