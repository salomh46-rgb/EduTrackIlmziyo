import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import { MOCK_GROUPS, MOCK_STUDENTS, MOCK_TEACHERS } from '@/lib/mockData'
import type {
  GroupDetail,
  GroupFormValues,
  GroupListItem,
  GroupSchedule,
  GroupStatus,
  GroupStudent,
  GroupTeacherSummary,
} from '@/features/groups/types'

type GroupRow = {
  id: string
  organization_id: string
  name: string
  subject: string
  teacher_id: string | null
  room: string | null
  schedule: unknown
  capacity: number
  status: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  teachers?: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
    avatar_url: string | null
    specialization: string | null
  } | null
  group_students?: Array<{
    id: string
    status: string
  }>
}

type GroupDetailRow = Omit<GroupRow, 'group_students'> & {
  group_students?: Array<{
    id: string
    student_id: string
    joined_at: string
    left_at: string | null
    status: string
    students?: {
      id: string
      first_name: string
      last_name: string
      phone: string | null
      avatar_url: string | null
      status: string
    } | null
  }>
}

function normalizeSchedule(schedule: unknown): GroupSchedule | null {
  if (!schedule) {
    return null
  }
  if (typeof schedule === 'string') {
    try {
      const parsed = JSON.parse(schedule) as unknown
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as GroupSchedule
      }
      return { raw: schedule }
    } catch {
      return { raw: schedule }
    }
  }
  if (typeof schedule === 'object' && schedule !== null) {
    return schedule as GroupSchedule
  }
  return null
}

function normalizeGroupStatus(status: string): GroupStatus {
  const upper = status.toUpperCase()
  if (upper === 'ACTIVE') return 'ACTIVE'
  if (upper === 'ARCHIVED') return 'ARCHIVED'
  if (upper === 'PLANNED' || upper === 'PAUSED') return 'PLANNED'
  return 'ACTIVE'
}

function normalizeGroupItem(row: GroupRow): GroupListItem {
  const teacher: GroupTeacherSummary | null = row.teachers
    ? {
        id: row.teachers.id,
        first_name: row.teachers.first_name,
        last_name: row.teachers.last_name,
        phone: row.teachers.phone,
        email: row.teachers.email,
        avatar_url: row.teachers.avatar_url,
        specialization: row.teachers.specialization,
      }
    : null

  const activeStudents = (row.group_students ?? []).filter((s) => s.status === 'ACTIVE')

  return {
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    subject: row.subject,
    teacher_id: row.teacher_id,
    teacher,
    room: row.room,
    schedule: normalizeSchedule(row.schedule),
    capacity: row.capacity ?? 0,
    status: normalizeGroupStatus(row.status),
    student_count: activeStudents.length,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted ?? false,
  }
}

export function friendlyGroupError(error: PostgrestError | null): string {
  if (!error) return 'Nomaʼlum xatolik yuz berdi.'
  if (error.code === '23505') return 'Bunday guruh allaqachon mavjud yoki oʼquvchi allaqachon biriktirilgan.'
  if (error.code === '42501') return 'Bu amalni bajarish uchun sizda ruxsat yoʼq.'
  return error.message || 'Maʼlumotlar bazasida xatolik yuz berdi.'
}

export async function listGroups(
  orgId: string,
  filter?: { search?: string; status?: string },
): Promise<GroupListItem[]> {
  if (!supabase) {
    let result = [...MOCK_GROUPS]
    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((g) => g.status === filter.status)
    }
    if (filter?.search && filter.search.trim()) {
      const term = filter.search.toLowerCase()
      result = result.filter(
        (g) => g.name.toLowerCase().includes(term) || g.subject.toLowerCase().includes(term) || (g.room && g.room.toLowerCase().includes(term))
      )
    }
    return result
  }

  let query = supabase
    .from('groups')
    .select(
      `
      id,
      organization_id,
      name,
      subject,
      teacher_id,
      room,
      schedule,
      capacity,
      status,
      created_at,
      updated_at,
      is_deleted,
      teachers (
        id,
        first_name,
        last_name,
        phone,
        email,
        avatar_url,
        specialization
      ),
      group_students (
        id,
        status
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filter?.status && filter.status !== 'ALL') {
    if (filter.status === 'PLANNED') {
      query = query.in('status', ['PAUSED', 'PLANNED'])
    } else {
      query = query.eq('status', filter.status)
    }
  }

  if (filter?.search && filter.search.trim()) {
    const term = `%${filter.search.trim()}%`
    query = query.or(`name.ilike.${term},subject.ilike.${term},room.ilike.${term}`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as unknown as GroupRow[]).map(normalizeGroupItem)
}

export async function getGroupDetail(orgId: string, groupId: string): Promise<GroupDetail | null> {
  if (!supabase) {
    const found = MOCK_GROUPS.find((g) => g.id === groupId) || MOCK_GROUPS[0]
    return {
      ...found,
      students: MOCK_STUDENTS.map((st, i) => ({
        id: `gs-${i}`,
        student_id: st.id,
        first_name: st.first_name,
        last_name: st.last_name,
        phone: st.phone,
        avatar_url: st.avatar_url,
        joined_at: '2026-08-01',
        left_at: null,
        status: 'ACTIVE',
      })),
    }
  }

  const { data, error } = await supabase
    .from('groups')
    .select(
      `
      id,
      organization_id,
      name,
      subject,
      teacher_id,
      room,
      schedule,
      capacity,
      status,
      created_at,
      updated_at,
      is_deleted,
      teachers (
        id,
        first_name,
        last_name,
        phone,
        email,
        avatar_url,
        specialization
      ),
      group_students (
        id,
        student_id,
        joined_at,
        left_at,
        status,
        students (
          id,
          first_name,
          last_name,
          phone,
          avatar_url,
          status
        )
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('id', groupId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as unknown as GroupDetailRow
  const base = normalizeGroupItem(row)

  const students: GroupStudent[] = (row.group_students ?? [])
    .filter((gs) => gs.status === 'ACTIVE' && gs.students)
    .map((gs) => ({
      id: gs.id,
      student_id: gs.student_id,
      first_name: gs.students!.first_name,
      last_name: gs.students!.last_name,
      phone: gs.students!.phone,
      avatar_url: gs.students!.avatar_url,
      status: gs.students!.status,
      joined_at: gs.joined_at,
      left_at: gs.left_at,
    }))

  return {
    ...base,
    student_count: students.length,
    students,
  }
}

export async function createGroup(
  orgId: string,
  values: GroupFormValues,
  actorProfileId?: string,
): Promise<GroupListItem> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const dbStatus = values.status === 'PLANNED' ? 'PAUSED' : values.status

  const payload = {
    organization_id: orgId,
    name: values.name.trim(),
    subject: values.subject.trim(),
    teacher_id: values.teacher_id || null,
    room: values.room.trim() || null,
    schedule: {
      days: values.schedule_days,
      time: values.schedule_time.trim(),
    },
    capacity: Number(values.capacity) || 0,
    status: dbStatus,
  }

  const { data, error } = await supabase
    .from('groups')
    .insert(payload)
    .select(
      `
      id,
      organization_id,
      name,
      subject,
      teacher_id,
      room,
      schedule,
      capacity,
      status,
      created_at,
      updated_at,
      is_deleted,
      teachers (
        id,
        first_name,
        last_name,
        phone,
        email,
        avatar_url,
        specialization
      )
    `,
    )
    .single()

  if (error) {
    throw error
  }

  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'group.create',
      entityType: 'group',
      entityId: data.id,
      metadata: { name: values.name, subject: values.subject },
    })
  }

  return normalizeGroupItem(data as unknown as GroupRow)
}

export async function updateGroup(
  orgId: string,
  groupId: string,
  values: GroupFormValues,
  actorProfileId?: string,
): Promise<GroupListItem> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const dbStatus = values.status === 'PLANNED' ? 'PAUSED' : values.status

  const payload = {
    name: values.name.trim(),
    subject: values.subject.trim(),
    teacher_id: values.teacher_id || null,
    room: values.room.trim() || null,
    schedule: {
      days: values.schedule_days,
      time: values.schedule_time.trim(),
    },
    capacity: Number(values.capacity) || 0,
    status: dbStatus,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('groups')
    .update(payload)
    .eq('organization_id', orgId)
    .eq('id', groupId)
    .select(
      `
      id,
      organization_id,
      name,
      subject,
      teacher_id,
      room,
      schedule,
      capacity,
      status,
      created_at,
      updated_at,
      is_deleted,
      teachers (
        id,
        first_name,
        last_name,
        phone,
        email,
        avatar_url,
        specialization
      ),
      group_students (
        id,
        status
      )
    `,
    )
    .single()

  if (error) {
    throw error
  }

  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'group.update',
      entityType: 'group',
      entityId: groupId,
      metadata: { name: values.name, subject: values.subject },
    })
  }

  return normalizeGroupItem(data as unknown as GroupRow)
}

export async function archiveGroup(
  orgId: string,
  groupId: string,
  actorProfileId?: string,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const { error } = await supabase
    .from('groups')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorProfileId || null,
      status: 'ARCHIVED',
    })
    .eq('organization_id', orgId)
    .eq('id', groupId)

  if (error) {
    throw error
  }

  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'group.archive',
      entityType: 'group',
      entityId: groupId,
    })
  }
}

export async function addStudentToGroup(
  orgId: string,
  groupId: string,
  studentId: string,
  actorProfileId?: string,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const { error } = await supabase.from('group_students').upsert(
    {
      organization_id: orgId,
      group_id: groupId,
      student_id: studentId,
      status: 'ACTIVE',
      joined_at: new Date().toISOString(),
      left_at: null,
    },
    { onConflict: 'group_id,student_id' },
  )

  if (error) {
    throw error
  }

  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'group.student_add',
      entityType: 'group_students',
      entityId: groupId,
      metadata: { student_id: studentId },
    })
  }
}

export async function removeStudentFromGroup(
  orgId: string,
  groupId: string,
  studentId: string,
  actorProfileId?: string,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const { error } = await supabase
    .from('group_students')
    .update({
      status: 'LEFT',
      left_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId)
    .eq('group_id', groupId)
    .eq('student_id', studentId)

  if (error) {
    throw error
  }

  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'group.student_remove',
      entityType: 'group_students',
      entityId: groupId,
      metadata: { student_id: studentId },
    })
  }
}

export async function listAvailableStudentsForGroup(
  orgId: string,
  groupId: string,
): Promise<Array<{ id: string; first_name: string; last_name: string; phone: string | null }>> {
  if (!supabase) {
    return MOCK_STUDENTS.map((s) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      phone: s.phone,
    }))
  }

  const { data: enrolled } = await supabase
    .from('group_students')
    .select('student_id')
    .eq('organization_id', orgId)
    .eq('group_id', groupId)
    .eq('status', 'ACTIVE')

  const enrolledIds = (enrolled ?? []).map((e) => e.student_id)

  let query = supabase
    .from('students')
    .select('id, first_name, last_name, phone')
    .eq('organization_id', orgId)
    .eq('is_deleted', false)
    .eq('status', 'ACTIVE')
    .order('first_name', { ascending: true })

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listTeachersForSelect(
  orgId: string,
): Promise<Array<{ id: string; first_name: string; last_name: string; specialization: string | null }>> {
  if (!supabase) {
    return MOCK_TEACHERS.map((t) => ({
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      specialization: t.specialization,
    }))
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, specialization')
    .eq('organization_id', orgId)
    .eq('is_deleted', false)
    .eq('status', 'ACTIVE')
    .order('first_name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}
