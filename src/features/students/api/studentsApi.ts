import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import { MOCK_STUDENTS } from '@/lib/mockData'
import type {
  RelationshipType,
  StudentDetail,
  StudentListItem,
  StudentParentLink,
  StudentStatus,
  StudentUpsertInput,
} from '@/features/students/types'

const studentSelect = `
  id,
  organization_id,
  first_name,
  last_name,
  avatar_url,
  phone,
  birth_date,
  gender,
  status,
  notes,
  created_at,
  updated_at,
  is_deleted,
  parent_students (
    id,
    relationship_type,
    is_primary,
    parents (
      id,
      first_name,
      last_name,
      phone,
      email,
      notification_enabled,
      telegram_accounts (
        id,
        is_verified,
        notification_enabled
      )
    )
  ),
  group_students (
    id,
    joined_at,
    left_at,
    status,
    groups (
      id,
      name,
      subject,
      status
    )
  )
`

type StudentRow = {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  phone: string | null
  birth_date: string | null
  gender: string | null
  status: StudentStatus
  notes: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  parent_students?: Array<{
    id: string
    relationship_type: RelationshipType
    is_primary: boolean
    parents?: Array<{
      id: string
      first_name: string
      last_name: string
      phone: string | null
      email: string | null
      notification_enabled: boolean
      telegram_accounts?: Array<{
        id: string
        is_verified: boolean
        notification_enabled: boolean
      }>
    }>
  }>
  group_students?: Array<{
    id: string
    joined_at: string
    left_at: string | null
    status: string
    groups?: Array<{
      id: string
      name: string
      subject: string
      status: string
    }>
  }>
}

type ListStudentsParams = {
  organizationId: string
  page: number
  pageSize: number
  search: string
  status: StudentStatus | 'ALL'
  groupId: string | 'ALL'
}

type LinkParentParams = {
  studentId: string
  parentId: string
  relationshipType: RelationshipType
  isPrimary: boolean
}

function likePattern(value: string) {
  return `%${value.trim().replace(/[%_,]/g, '')}%`
}

function normalizeParent(record: NonNullable<StudentRow['parent_students']>[number]) {
  const parent = record.parents?.[0]
  if (!parent) {
    return null
  }

  const telegram = parent.telegram_accounts?.[0]

  return {
    id: parent.id,
    first_name: parent.first_name,
    last_name: parent.last_name,
    phone: parent.phone,
    email: parent.email,
    notification_enabled: parent.notification_enabled,
    telegram_verified: Boolean(telegram?.is_verified),
  }
}

function normalizeGroup(record: NonNullable<StudentRow['group_students']>[number]) {
  const group = record.groups?.[0]

  if (!group) {
    return null
  }

  return {
    id: group.id,
    name: group.name,
    subject: group.subject,
    status: group.status,
  }
}

function normalizeStudent(row: StudentRow): StudentListItem {
  const parents = row.parent_students ?? []
  const groups = row.group_students ?? []
  const primaryParent = parents.find((item) => item.is_primary) ?? parents[0] ?? null
  const primaryGroup = groups.find((item) => item.status === 'ACTIVE') ?? groups[0] ?? null

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    avatar_url: row.avatar_url,
    phone: row.phone,
    birth_date: row.birth_date,
    gender: row.gender,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted,
    primary_parent: primaryParent ? normalizeParent(primaryParent) : null,
    primary_group: primaryGroup ? normalizeGroup(primaryGroup) : null,
    parent_count: parents.length,
    group_count: groups.length,
  }
}

function mapDatabaseError(error: PostgrestError) {
  if (error.code === '23505') {
    return 'This relationship already exists.'
  }

  if (error.code === '42501') {
    return 'You do not have permission to perform this action.'
  }

  return error.message || 'A database error occurred.'
}

export function getFriendlyStudentError(error: PostgrestError | null) {
  if (!error) {
    return 'Something went wrong.'
  }

  return mapDatabaseError(error)
}

export async function listStudents(params: ListStudentsParams) {
  if (!supabase) {
    let rows = [...MOCK_STUDENTS]
    if (params.status !== 'ALL') {
      rows = rows.filter((s) => s.status === params.status)
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase()
      rows = rows.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)),
      )
    }
    return { rows, totalCount: rows.length }
  }

  const { organizationId, page, pageSize, search, status, groupId } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let groupStudentIds: string[] | null = null

  if (groupId !== 'ALL') {
    const { data: groupStudents, error: groupError } = await supabase
      .from('group_students')
      .select('student_id')
      .eq('organization_id', organizationId)
      .eq('group_id', groupId)
      .eq('status', 'ACTIVE')

    if (groupError) {
      throw groupError
    }

    groupStudentIds = groupStudents?.map((item) => item.student_id) ?? []
    if (groupStudentIds.length === 0) {
      return { rows: [], totalCount: 0 }
    }
  }

  let query = supabase
    .from('students')
    .select(studentSelect, { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status !== 'ALL') {
    query = query.eq('status', status)
  }

  if (search.trim()) {
    query = query.or(
      `first_name.ilike.${likePattern(search)},last_name.ilike.${likePattern(search)},phone.ilike.${likePattern(search)}`,
    )
  }

  if (groupStudentIds) {
    query = query.in('id', groupStudentIds)
  }

  const { data, error, count } = await query

  if (error) {
    throw error
  }

  return {
    rows: ((data ?? []) as StudentRow[]).map(normalizeStudent),
    totalCount: count ?? 0,
  }
}

export async function getStudent(organizationId: string, studentId: string): Promise<StudentListItem | null> {
  if (!supabase) {
    return MOCK_STUDENTS.find((s) => s.id === studentId) ?? MOCK_STUDENTS[0]
  }

  const { data, error } = await supabase
    .from('students')
    .select(studentSelect)
    .eq('organization_id', organizationId)
    .eq('id', studentId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? normalizeStudent(data as StudentRow) : null
}

export async function getStudentDetail(organizationId: string, studentId: string): Promise<StudentDetail | null> {
  if (!supabase) {
    const s = MOCK_STUDENTS.find((item) => item.id === studentId) ?? MOCK_STUDENTS[0]
    return {
      ...s,
      parents: s.primary_parent
        ? [
            {
              link_id: 'link-1',
              id: s.primary_parent.id,
              relationship_type: 'FATHER' as const,
              is_primary: true,
              first_name: s.primary_parent.first_name,
              last_name: s.primary_parent.last_name,
              phone: s.primary_parent.phone,
              email: null,
              notification_enabled: true,
              telegram_verified: true,
            },
          ]
        : [],
      groups: s.primary_group
        ? [
            {
              id: s.primary_group.id,
              name: s.primary_group.name,
              subject: s.primary_group.subject,
              status: 'ACTIVE',
              joined_at: '2026-08-01',
              left_at: null,
            },
          ]
        : [],
    }
  }

  const { data, error } = await supabase
    .from('students')
    .select(studentSelect)
    .eq('organization_id', organizationId)
    .eq('id', studentId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as StudentRow
  const base = normalizeStudent(row)

  return {
    ...base,
    parents: (row.parent_students ?? [])
      .map((link) => {
        const parent = normalizeParent(link)
        if (!parent) {
          return null
        }

        return {
          link_id: link.id,
          ...parent,
          relationship_type: link.relationship_type,
          is_primary: link.is_primary,
        }
      })
      .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    groups: (row.group_students ?? [])
      .map((link) => {
        const group = normalizeGroup(link)
        if (!group) {
          return null
        }

        return {
          ...group,
          joined_at: link.joined_at,
          left_at: link.left_at,
        }
      })
      .filter((g): g is NonNullable<typeof g> => Boolean(g)),
  }
}

export async function listStudentGroups(organizationId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('groups')
    .select('id, name, subject, status')
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listStudentParents(organizationId: string, studentId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('parent_students')
    .select(
      `
      id,
      relationship_type,
      is_primary,
      parents (
        id,
        first_name,
        last_name,
        phone,
        email,
        notification_enabled,
        telegram_accounts (
          id,
          is_verified,
          notification_enabled
        )
      )
    `,
    )
    .eq('organization_id', organizationId)
    .eq('student_id', studentId)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listAvailableParents(organizationId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('parents')
    .select(
      `
      id,
      first_name,
      last_name,
      phone,
      email,
      notification_enabled,
      telegram_accounts (
        id,
        is_verified,
        notification_enabled
      )
    `,
    )
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createStudent(
  organizationId: string,
  actorProfileId: string,
  values: StudentUpsertInput,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const payload = {
    organization_id: organizationId,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone: values.phone.trim() || null,
    birth_date: values.birth_date || null,
    gender: values.gender || null,
    status: values.status,
    notes: values.notes.trim() || null,
  }

  const { data, error } = await supabase.from('students').insert(payload).select().single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'STUDENT_CREATED',
    entityType: 'student',
    entityId: data.id,
    metadata: {
      first_name: data.first_name,
      last_name: data.last_name,
    },
  })

  return data
}

export async function updateStudent(
  organizationId: string,
  actorProfileId: string,
  studentId: string,
  values: StudentUpsertInput,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const payload = {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone: values.phone.trim() || null,
    birth_date: values.birth_date || null,
    gender: values.gender || null,
    status: values.status,
    notes: values.notes.trim() || null,
  }

  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('organization_id', organizationId)
    .eq('id', studentId)
    .select()
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'STUDENT_UPDATED',
    entityType: 'student',
    entityId: data.id,
  })

  return data
}

export async function archiveStudent(
  organizationId: string,
  actorProfileId: string,
  studentId: string,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('students')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorProfileId,
    })
    .eq('organization_id', organizationId)
    .eq('id', studentId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'STUDENT_ARCHIVED',
    entityType: 'student',
    entityId: data.id,
  })

  return data
}

export async function linkParentToStudent(
  organizationId: string,
  actorProfileId: string,
  params: LinkParentParams,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('parent_students')
    .insert({
      organization_id: organizationId,
      student_id: params.studentId,
      parent_id: params.parentId,
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
    metadata: {
      student_id: params.studentId,
      parent_id: params.parentId,
      relationship_type: params.relationshipType,
      is_primary: params.isPrimary,
    },
  })

  return data
}

export async function unlinkParentFromStudent(
  organizationId: string,
  actorProfileId: string,
  linkId: string,
  studentId: string,
  parentId: string,
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error } = await supabase
    .from('parent_students')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', linkId)

  if (error) {
    throw error
  }

  await recordAuditEvent({
    organizationId,
    actorProfileId,
    action: 'PARENT_STUDENT_UNLINKED',
    entityType: 'parent_student',
    entityId: linkId,
    metadata: { student_id: studentId, parent_id: parentId },
  })
}
