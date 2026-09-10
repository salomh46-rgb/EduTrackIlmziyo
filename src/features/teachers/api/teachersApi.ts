import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import type { TeacherDetail, TeacherFormValues, TeacherListItem, TeacherStatus } from '@/features/teachers/types'

const teacherSelect = `
  id,
  organization_id,
  first_name,
  last_name,
  phone,
  email,
  avatar_url,
  specialization,
  status,
  created_at,
  updated_at,
  is_deleted,
  groups (
    id,
    name,
    subject,
    status
  )
`

type TeacherRow = {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  specialization: string | null
  status: TeacherStatus
  created_at: string
  updated_at: string
  is_deleted: boolean
  groups?: Array<{ id: string; name: string; subject: string; status: string }>
}

function normalizeTeacher(row: TeacherRow): TeacherListItem {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    email: row.email,
    avatar_url: row.avatar_url,
    specialization: row.specialization,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted,
    groups_count: row.groups?.length ?? 0,
  }
}

function friendlyTeacherError(error: PostgrestError | null) {
  if (!error) {
    return 'Something went wrong.'
  }

  if (error.code === '23505') {
    return 'This teacher record already exists.'
  }

  if (error.code === '42501') {
    return 'You do not have permission to perform this action.'
  }

  return error.message || 'A database error occurred.'
}

export function formatTeacherError(error: PostgrestError | null) {
  return friendlyTeacherError(error)
}

export async function listTeachers(
  organizationId: string,
  params: { page: number; pageSize: number; search: string; status: TeacherStatus | 'ALL' },
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const from = params.page * params.pageSize
  const to = from + params.pageSize - 1

  let query = supabase
    .from('teachers')
    .select(teacherSelect, { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.status !== 'ALL') {
    query = query.eq('status', params.status)
  }

  if (params.search.trim()) {
    const pattern = `%${params.search.trim().replace(/[%_,]/g, '')}%`
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},specialization.ilike.${pattern}`)
  }

  const { data, error, count } = await query
  if (error) {
    throw error
  }

  return {
    rows: ((data ?? []) as TeacherRow[]).map(normalizeTeacher),
    totalCount: count ?? 0,
  }
}

export async function getTeacherDetail(organizationId: string, teacherId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('teachers')
    .select(teacherSelect)
    .eq('organization_id', organizationId)
    .eq('id', teacherId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as TeacherRow
  return {
    ...normalizeTeacher(row),
    groups: row.groups ?? [],
  } satisfies TeacherDetail
}

export async function createTeacher(organizationId: string, actorProfileId: string, values: TeacherFormValues) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('teachers')
    .insert({
      organization_id: organizationId,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      specialization: values.specialization.trim() || null,
      status: values.status,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'TEACHER_CREATED',
    entityType: 'teacher',
    entityId: data.id,
  })

  return data
}

export async function updateTeacher(
  organizationId: string,
  actorProfileId: string,
  teacherId: string,
  values: TeacherFormValues,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('teachers')
    .update({
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      specialization: values.specialization.trim() || null,
      status: values.status,
    })
    .eq('organization_id', organizationId)
    .eq('id', teacherId)
    .select()
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'TEACHER_UPDATED',
    entityType: 'teacher',
    entityId: data.id,
  })

  return data
}

export async function archiveTeacher(organizationId: string, actorProfileId: string, teacherId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('teachers')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorProfileId,
      status: 'ARCHIVED',
    })
    .eq('organization_id', organizationId)
    .eq('id', teacherId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'TEACHER_ARCHIVED',
    entityType: 'teacher',
    entityId: data.id,
  })

  return data
}
