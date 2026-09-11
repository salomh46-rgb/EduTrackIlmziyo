import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import { MOCK_PARENTS } from '@/lib/mockData'
import type { ParentDetail, ParentFormValues, ParentListItem, ParentStudentSummary } from '@/features/parents/types'
import type { RelationshipType } from '@/features/students/types'

const parentSelect = `
  id,
  organization_id,
  first_name,
  last_name,
  phone,
  email,
  notification_enabled,
  telegram_username,
  created_at,
  updated_at,
  is_deleted,
  telegram_accounts (
    id,
    is_verified,
    notification_enabled
  ),
  parent_students (
    id,
    relationship_type,
    is_primary,
    students (
      id,
      first_name,
      last_name,
      phone,
      group_students (
        id,
        status,
        groups (
          id,
          name
        )
      )
    )
  )
`

type ParentRow = {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  notification_enabled: boolean
  telegram_username: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  telegram_accounts?: Array<{ id: string; is_verified: boolean; notification_enabled: boolean }>
  parent_students?: Array<{
    id: string
    relationship_type: RelationshipType
    is_primary: boolean
    students?: Array<{
      id: string
      first_name: string
      last_name: string
      phone: string | null
      group_students?: Array<{
        id: string
        status: string
        groups?: Array<{ id: string; name: string }>
      }>
    }>
  }>
}

function normalizeParent(row: ParentRow): ParentListItem {
  const telegram = row.telegram_accounts?.[0]
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    email: row.email,
    notification_enabled: row.notification_enabled,
    telegram_verified: Boolean(telegram?.is_verified),
    telegram_username: row.telegram_username,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted,
    child_count: row.parent_students?.length ?? 0,
  }
}

function getFriendlyParentError(error: PostgrestError | null) {
  if (!error) {
    return 'Something went wrong.'
  }

  if (error.code === '23505') {
    return 'This relationship already exists.'
  }

  if (error.code === '42501') {
    return 'You do not have permission to perform this action.'
  }

  return error.message || 'A database error occurred.'
}

export function formatParentError(error: PostgrestError | null) {
  return getFriendlyParentError(error)
}

export async function listParents(
  organizationId: string,
  params: { page: number; pageSize: number; search: string },
) {
  if (!supabase) {
    let rows = [...MOCK_PARENTS]
    if (params.search.trim()) {
      const q = params.search.trim().toLowerCase()
      rows = rows.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)),
      )
    }
    return { rows, totalCount: rows.length }
  }

  const from = params.page * params.pageSize
  const to = from + params.pageSize - 1

  let query = supabase
    .from('parents')
    .select(parentSelect, { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.search.trim()) {
    const pattern = `%${params.search.trim().replace(/[%_,]/g, '')}%`
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern}`)
  }

  const { data, error, count } = await query
  if (error) {
    throw error
  }

  return {
    rows: ((data ?? []) as ParentRow[]).map(normalizeParent),
    totalCount: count ?? 0,
  }
}

export async function getParentDetail(organizationId: string, parentId: string) {
  if (!supabase) {
    const p = MOCK_PARENTS.find((item) => item.id === parentId) ?? MOCK_PARENTS[0]
    return {
      ...p,
      children: [
        {
          link_id: 'plink-1',
          id: 'std-1',
          first_name: 'Jamshid',
          last_name: 'Rasulov',
          phone: '+998 90 123 45 67',
          relationship_type: 'FATHER' as const,
          is_primary: true,
          group_name: 'Matematika Intensive (G-12)',
        },
      ],
    }
  }

  const { data, error } = await supabase
    .from('parents')
    .select(parentSelect)
    .eq('organization_id', organizationId)
    .eq('id', parentId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as ParentRow
  const base = normalizeParent(row)

  return {
    ...base,
    children: (row.parent_students ?? [])
      .map((link) => {
        const student = link.students?.[0]
        if (!student) {
          return null
        }

        const group = student.group_students?.[0]?.groups?.[0] ?? null
        return {
          link_id: link.id,
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          group_name: group?.name ?? null,
          relationship_type: link.relationship_type,
          is_primary: link.is_primary,
        } satisfies ParentStudentSummary
      })
      .filter(Boolean) as ParentStudentSummary[],
  } satisfies ParentDetail
}

export async function listAvailableStudents(organizationId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, phone')
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createParent(
  organizationId: string,
  actorProfileId: string,
  values: ParentFormValues,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const payload = {
    organization_id: organizationId,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
  }

  const { data, error } = await supabase.from('parents').insert(payload).select().single()
  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'PARENT_CREATED',
    entityType: 'parent',
    entityId: data.id,
  })

  return data
}

export async function updateParent(
  organizationId: string,
  actorProfileId: string,
  parentId: string,
  values: ParentFormValues,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('parents')
    .update({
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
    })
    .eq('organization_id', organizationId)
    .eq('id', parentId)
    .select()
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'PARENT_UPDATED',
    entityType: 'parent',
    entityId: data.id,
  })

  return data
}

export async function archiveParent(
  organizationId: string,
  actorProfileId: string,
  parentId: string,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('parents')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorProfileId,
    })
    .eq('organization_id', organizationId)
    .eq('id', parentId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'PARENT_ARCHIVED',
    entityType: 'parent',
    entityId: data.id,
  })

  return data
}

export async function linkStudentToParent(
  organizationId: string,
  actorProfileId: string,
  params: { parentId: string; studentId: string; relationshipType: RelationshipType; isPrimary: boolean },
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('parent_students')
    .insert({
      organization_id: organizationId,
      parent_id: params.parentId,
      student_id: params.studentId,
      relationship_type: params.relationshipType,
      is_primary: params.isPrimary,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'PARENT_STUDENT_LINKED',
    entityType: 'parent_student',
    entityId: data.id,
    metadata: params,
  })

  return data
}

export async function unlinkStudentFromParent(
  organizationId: string,
  actorProfileId: string,
  linkId: string,
  parentId: string,
  studentId: string,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error } = await supabase.from('parent_students').delete().eq('organization_id', organizationId).eq('id', linkId)
  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'PARENT_STUDENT_UNLINKED',
    entityType: 'parent_student',
    entityId: linkId,
    metadata: { parentId, studentId },
  })
}
