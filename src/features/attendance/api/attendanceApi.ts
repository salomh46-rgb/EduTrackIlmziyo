import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import { MOCK_GROUPS, MOCK_ATTENDANCE_ROSTER } from '@/lib/mockData'
import type {
  AttendanceRecord,
  AttendanceRosterStudent,
  AttendanceStats,
  AttendanceStatus,
  AttendanceSummary,
  LessonWithAttendance,
} from '@/features/attendance/types'

export function friendlyAttendanceError(error: PostgrestError | null): string {
  if (!error) return 'Nomaʼlum xatolik yuz berdi.'
  if (error.code === '23505') return 'Ushbu oʼquvchi uchun davomat yozuvi allaqachon saqlangan.'
  if (error.code === '42501') return 'Bu amalni bajarish uchun sizda ruxsat yoʼq.'
  return error.message || 'Maʼlumotlar bazasida xatolik yuz berdi.'
}

export async function listGroupsForAttendance(
  orgId: string,
): Promise<Array<{ id: string; name: string; subject: string; room: string | null }>> {
  if (!supabase) {
    return MOCK_GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      room: g.room,
    }))
  }

  const { data, error } = await supabase
    .from('groups')
    .select('id, name, subject, room')
    .eq('organization_id', orgId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listLessonsForDate(
  orgId: string,
  date: string,
): Promise<LessonWithAttendance[]> {
  if (!supabase) {
    return [
      {
        id: 'lsn-1',
        group_id: 'grp-1',
        group_name: 'Matematika Intensive (G-12)',
        subject: 'Matematika',
        teacher_id: 'tch-1',
        teacher_name: 'Sardor Qodirov',
        starts_at: `${date}T09:00:00Z`,
        ends_at: `${date}T10:30:00Z`,
        status: 'SCHEDULED',
        room: '104-xona',
      },
      {
        id: 'lsn-2',
        group_id: 'grp-2',
        group_name: 'IELTS 7.5+ Masterclass',
        subject: 'Ingliz tili',
        teacher_id: 'tch-2',
        teacher_name: 'Madina Umarova',
        starts_at: `${date}T11:00:00Z`,
        ends_at: `${date}T12:30:00Z`,
        status: 'SCHEDULED',
        room: '202-xona',
      },
    ]
  }

  const startIso = `${date}T00:00:00.000Z`
  const endIso = `${date}T23:59:59.999Z`

  const { data, error } = await supabase
    .from('lessons')
    .select(
      `
      id,
      group_id,
      subject,
      starts_at,
      ends_at,
      status,
      room,
      groups (
        id,
        name,
        subject
      ),
      teachers (
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq('organization_id', orgId)
    .gte('starts_at', startIso)
    .lte('starts_at', endIso)
    .order('starts_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    group_id: row.group_id,
    group_name: row.groups?.name ?? 'Guruh',
    subject: row.subject || row.groups?.subject || '',
    teacher_id: row.teachers?.id ?? null,
    teacher_name: row.teachers ? `${row.teachers.first_name} ${row.teachers.last_name}` : null,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    room: row.room,
  }))
}

export async function getGroupAttendanceRoster(
  orgId: string,
  groupId: string,
  lessonDate: string,
): Promise<{
  students: AttendanceRosterStudent[]
  existingLessonId: string | null
}> {
  if (!supabase) {
    return {
      students: MOCK_ATTENDANCE_ROSTER,
      existingLessonId: 'lsn-1',
    }
  }

  // 1. Fetch enrolled active students in group
  const { data: groupStudents, error: gsError } = await supabase
    .from('group_students')
    .select(
      `
      id,
      student_id,
      status,
      students (
        id,
        first_name,
        last_name,
        phone,
        avatar_url,
        status,
        parent_students (
          is_primary,
          parents (
            id,
            first_name,
            last_name,
            phone,
            telegram_accounts (
              is_verified
            )
          )
        )
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('group_id', groupId)
    .eq('status', 'ACTIVE')

  if (gsError) {
    throw gsError
  }

  // 2. Fetch existing attendance records for this group and date
  const { data: attendanceRecords, error: attError } = await supabase
    .from('attendance')
    .select('id, student_id, lesson_id, status, note')
    .eq('organization_id', orgId)
    .eq('group_id', groupId)
    .eq('lesson_date', lessonDate)

  if (attError) {
    throw attError
  }

  const existingLessonId = attendanceRecords?.[0]?.lesson_id ?? null
  const recordMap = new Map<string, { id: string; status: AttendanceStatus; note: string | null }>()
  attendanceRecords?.forEach((r) => {
    recordMap.set(r.student_id, {
      id: r.id,
      status: r.status as AttendanceStatus,
      note: r.note,
    })
  })

  // 3. Combine into roster
  const students: AttendanceRosterStudent[] = ((groupStudents ?? []) as any[])
    .filter((gs) => gs.students)
    .map((gs) => {
      const s = gs.students
      const existing = recordMap.get(s.id)

      // Find primary parent
      const parentLinks = s.parent_students ?? []
      const primaryLink = parentLinks.find((p: any) => p.is_primary) ?? parentLinks[0] ?? null
      const parent = primaryLink?.parents ?? null
      const telegramVerified = Boolean(parent?.telegram_accounts?.some((t: any) => t.is_verified))

      return {
        student_id: s.id,
        student_name: `${s.first_name} ${s.last_name}`,
        first_name: s.first_name,
        last_name: s.last_name,
        phone: s.phone,
        avatar_url: s.avatar_url,
        status: existing?.status ?? 'PRESENT',
        note: existing?.note ?? '',
        attendance_id: existing?.id ?? null,
        parent_id: parent?.id ?? null,
        parent_name: parent ? `${parent.first_name} ${parent.last_name}` : null,
        parent_phone: parent?.phone ?? null,
        telegram_verified: telegramVerified,
      }
    })

  // Sort by last name, first name
  students.sort((a, b) => a.student_name.localeCompare(b.student_name))

  return { students, existingLessonId }
}

export type RecordAttendanceBulkInput = {
  groupId: string
  lessonId?: string
  lessonDate: string
  records: Array<{
    studentId: string
    status: AttendanceStatus
    note?: string
  }>
}

export async function recordAttendanceBulk(
  orgId: string,
  input: RecordAttendanceBulkInput,
  actorProfileId?: string,
): Promise<{ savedCount: number; absentNotificationsQueued: number }> {
  if (!supabase) {
    const absentCount = input.records.filter((r) => r.status === 'ABSENT').length
    return {
      savedCount: input.records.length,
      absentNotificationsQueued: absentCount,
    }
  }

  const { groupId, lessonDate, records } = input

  // 1. Resolve or create lesson
  let lessonId = input.lessonId

  if (!lessonId) {
    // Check if a lesson exists on this date
    const startIso = `${lessonDate}T00:00:00.000Z`
    const endIso = `${lessonDate}T23:59:59.999Z`

    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('organization_id', orgId)
      .eq('group_id', groupId)
      .gte('starts_at', startIso)
      .lte('starts_at', endIso)
      .limit(1)

    if (existingLessons && existingLessons.length > 0) {
      lessonId = existingLessons[0].id
    } else {
      // Create new lesson
      const { data: groupData } = await supabase
        .from('groups')
        .select('name, subject, teacher_id, room')
        .eq('id', groupId)
        .single()

      const newLessonPayload = {
        organization_id: orgId,
        group_id: groupId,
        teacher_id: groupData?.teacher_id ?? null,
        title: `${groupData?.name || 'Guruh'} darsi`,
        subject: groupData?.subject || 'Dars',
        starts_at: `${lessonDate}T09:00:00.000Z`,
        ends_at: `${lessonDate}T10:30:00.000Z`,
        status: 'COMPLETED',
        room: groupData?.room || null,
        notes: `${lessonDate} kungi davomat darsi`,
      }

      const { data: createdLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert(newLessonPayload)
        .select('id')
        .single()

      if (lessonError) {
        throw lessonError
      }

      lessonId = createdLesson.id
    }
  }

  // 2. Upsert attendance records
  const attendanceRows = records.map((r) => ({
    organization_id: orgId,
    group_id: groupId,
    lesson_id: lessonId,
    student_id: r.studentId,
    lesson_date: lessonDate,
    status: r.status,
    note: r.note?.trim() || null,
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await supabase
    .from('attendance')
    .upsert(attendanceRows, { onConflict: 'student_id,lesson_id' })

  if (upsertError) {
    throw upsertError
  }

  // 3. Enqueue Telegram notification for ANY 'ABSENT' student
  const absentRecords = records.filter((r) => r.status === 'ABSENT')
  let absentNotificationsQueued = 0

  if (absentRecords.length > 0) {
    try {
      // Fetch group name
      const { data: group } = await supabase
        .from('groups')
        .select('name, subject')
        .eq('id', groupId)
        .single()

      const absentStudentIds = absentRecords.map((r) => r.studentId)

      // Fetch student + primary parent details
      const { data: studentParents } = await supabase
        .from('students')
        .select(
          `
          id,
          first_name,
          last_name,
          parent_students (
            is_primary,
            parents (
              id,
              first_name,
              last_name,
              phone,
              telegram_user_id,
              telegram_accounts (
                telegram_user_id,
                is_verified
              )
            )
          )
        `,
        )
        .in('id', absentStudentIds)

      const notificationsToInsert = []

      for (const absentRec of absentRecords) {
        const student = ((studentParents ?? []) as any[]).find((s) => s.id === absentRec.studentId)
        if (!student) continue

        const parentLink = student.parent_students?.find((p: any) => p.is_primary) ?? student.parent_students?.[0]
        const parent = parentLink?.parents

        const tgAccount = parent?.telegram_accounts?.find((t: any) => t.is_verified)
        const telegramUserId = tgAccount?.telegram_user_id ?? parent?.telegram_user_id ?? null

        notificationsToInsert.push({
          organization_id: orgId,
          notification_type: 'ATTENDANCE_ABSENT',
          channel: 'telegram',
          status: 'PENDING',
          recipient_parent_id: parent?.id ?? null,
          payload: {
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            group_id: groupId,
            group_name: group?.name || 'Guruh',
            subject: group?.subject || '',
            date: lessonDate,
            note: absentRec.note || "Sababsiz darsga kelmadi",
            parent_name: parent ? `${parent.first_name} ${parent.last_name}` : null,
            parent_phone: parent?.phone || null,
            telegram_user_id: telegramUserId,
            queued_at: new Date().toISOString(),
          },
        })
      }

      if (notificationsToInsert.length > 0) {
        const { error: notifError } = await supabase
          .from('notification_queue')
          .insert(notificationsToInsert)

        if (!notifError) {
          absentNotificationsQueued = notificationsToInsert.length
        }
      }
    } catch {
      // Telegram notification queue shouldn't block successful attendance recording
    }
  }

  // 4. Audit log
  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'attendance.record_bulk',
      entityType: 'attendance',
      entityId: groupId,
      metadata: {
        lesson_date: lessonDate,
        total_records: records.length,
        absent_count: absentRecords.length,
      },
    })
  }

  return {
    savedCount: records.length,
    absentNotificationsQueued,
  }
}

export async function getAttendanceSummary(
  orgId: string,
  startDate: string,
  endDate: string,
): Promise<AttendanceSummary> {
  if (!supabase) {
    return {
      total: 48,
      present: 42,
      late: 3,
      excused: 1,
      absent: 2,
      rate: 94,
      period_start: startDate,
      period_end: endDate,
    }
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('status')
    .eq('organization_id', orgId)
    .gte('lesson_date', startDate)
    .lte('lesson_date', endDate)

  if (error) {
    throw error
  }

  const rows = data ?? []
  const total = rows.length
  const present = rows.filter((r) => r.status === 'PRESENT').length
  const late = rows.filter((r) => r.status === 'LATE').length
  const excused = rows.filter((r) => r.status === 'EXCUSED').length
  const absent = rows.filter((r) => r.status === 'ABSENT').length

  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

  return {
    total,
    present,
    late,
    excused,
    absent,
    rate,
    period_start: startDate,
    period_end: endDate,
  }
}
