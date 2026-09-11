import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth'

export type WorkspaceOrganization = {
  id: string
  name: string
  slug: string
  timezone: string
  status: string
}

type OrganizationMembership = {
  organization_id: string
  role: string
  status: string
  organizations: WorkspaceOrganization | WorkspaceOrganization[] | null
}

export function useWorkspaceOrganization() {
  const { profile, isSupabaseConfigured } = useAuth()
  const [organization, setOrganization] = useState<WorkspaceOrganization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadOrganization() {
      if (!isSupabaseConfigured || !profile?.id || !supabase) {
        setOrganization({
          id: 'org-ilmziyo',
          name: "Ilmziyo O'quv Markazi",
          slug: 'ilmziyo',
          timezone: 'Asia/Tashkent',
          status: 'ACTIVE',
        })
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations(id, name, slug, timezone, status)')
        .eq('profile_id', profile.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true })
        .limit(1)

      if (!active) {
        return
      }

      if (queryError) {
        setOrganization(null)
        setError(queryError.message)
        setLoading(false)
        return
      }

      const membership = (data?.[0] as OrganizationMembership | undefined) ?? null
      const orgData = membership?.organizations
      const resolvedOrganization = Array.isArray(orgData) ? orgData[0] ?? null : orgData
      setOrganization(resolvedOrganization ?? null)
      setLoading(false)
    }

    void loadOrganization()

    return () => {
      active = false
    }
  }, [isSupabaseConfigured, profile?.id])

  return {
    organization,
    loading,
    error,
  }
}
