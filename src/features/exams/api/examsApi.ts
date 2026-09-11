import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import type {
  ExamDetail,
  ExamFormValues,
  ExamListItem,
  ExamResultInput,
  ExamResultItem,
  StudentExamLeaderboard,
} from '@/features/exams/types'

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

export function friendlyExamError(error: PostgrestError | null): string {
  if (!error) return 'Nomaʼlum xatolik yuz berdi.'
  if (error.code === '23505') return 'Ushbu imtihon natijasi allaqachon kiritilgan.'
  if (error.code === '42501') return 'Bu amalni bajarish uchun sizda ruxsat yoʼq.'
  return error.message || 'Maʼlumotlar bazasida xatolik yuz berdi.'
}

export async function listGroupsForExams(
  orgId: string,
): Promise<Array<{ id: string; name: string; subject: string; teacher_id: string | null }>> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const { data, error } = await supabase
    .from('groups')
    .select('id, name, subject, teacher_id')
    .eq('organization_id', orgId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listExams(
  orgId: string,
  groupId?: string,
): Promise<ExamListItem[]> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  let query = supabase
    .from('exams')
    .select(
      `
      id,
      organization_id,
      group_id,
      teacher_id,
      title,
      subject,
      exam_date,
      maximum_score,
      created_at,
      groups (
        id,
        name
      ),
      teachers (
        id,
        first_name,
        last_name
      ),
      exam_results (
        score
      )
    `,
    )
    .eq('organization_id', orgId)
    .order('exam_date', { ascending: false })

  if (groupId && groupId !== 'ALL') {
    query = query.eq('group_id', groupId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as any[]).map((row) => {
    const results = row.exam_results ?? []
    const scores = results.map((r: any) => Number(r.score) || 0)
    const count = scores.length
    const avg = count > 0 ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / count) * 10) / 10 : 0
    const highest = count > 0 ? Math.max(...scores) : 0

    return {
      id: row.id,
      organization_id: row.organization_id,
      group_id: row.group_id,
      group_name: row.groups?.name || 'Guruh',
      teacher_id: row.teacher_id,
      teacher_name: row.teachers ? `${row.teachers.first_name} ${row.teachers.last_name}` : null,
      title: row.title,
      subject: row.subject,
      exam_date: row.exam_date,
      maximum_score: Number(row.maximum_score),
      results_count: count,
      average_score: avg,
      highest_score: highest,
      created_at: row.created_at,
    }
  })
}

export async function getExamDetail(
  orgId: string,
  examId: string,
): Promise<ExamDetail | null> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  // 1. Fetch exam
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select(
      `
      id,
      organization_id,
      group_id,
      teacher_id,
      title,
      subject,
      exam_date,
      maximum_score,
      created_at,
      groups (
        id,
        name
      ),
      teachers (
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('id', examId)
    .single()

  if (examError) {
    throw examError
  }

  if (!exam) return null

  // 2. Fetch enrolled students for the group
  const { data: groupStudents, error: gsError } = await supabase
    .from('group_students')
    .select(
      `
      student_id,
      students (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('group_id', exam.group_id)
    .eq('status', 'ACTIVE')

  if (gsError) {
    throw gsError
  }

  // 3. Fetch existing exam_results
  const { data: results, error: resError } = await supabase
    .from('exam_results')
    .select('id, student_id, score, percentage, grade, teacher_comment')
    .eq('organization_id', orgId)
    .eq('exam_id', examId)

  if (resError) {
    throw resError
  }

  const resultMap = new Map<string, any>()
  results?.forEach((r) => resultMap.set(r.student_id, r))

  const maxScore = Number(exam.maximum_score) || 100

  const studentResults: ExamResultItem[] = ((groupStudents ?? []) as any[])
    .filter((gs) => gs.students)
    .map((gs) => {
      const s = gs.students
      const res = resultMap.get(s.id)
      const score = res ? Number(res.score) : 0
      const percentage = res ? Number(res.percentage) : 0
      const grade = res?.grade || calculateGrade(percentage)

      return {
        id: res?.id,
        student_id: s.id,
        student_name: `${s.first_name} ${s.last_name}`,
        first_name: s.first_name,
        last_name: s.last_name,
        avatar_url: s.avatar_url,
        score,
        percentage,
        grade,
        teacher_comment: res?.teacher_comment ?? '',
      }
    })

  studentResults.sort((a, b) => b.score - a.score)

  const scores = results?.map((r) => Number(r.score)) ?? []
  const count = scores.length
  const avg = count > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0
  const highest = count > 0 ? Math.max(...scores) : 0

  return {
    id: exam.id,
    organization_id: exam.organization_id,
    group_id: exam.group_id,
    group_name: (exam.groups as any)?.name || 'Guruh',
    teacher_id: exam.teacher_id,
    teacher_name: (exam.teachers as any)
      ? `${(exam.teachers as any).first_name} ${(exam.teachers as any).last_name}`
      : null,
    title: exam.title,
    subject: exam.subject,
    exam_date: exam.exam_date,
    maximum_score: maxScore,
    results_count: count,
    average_score: avg,
    highest_score: highest,
    created_at: exam.created_at,
    results: studentResults,
  }
}

export async function createExam(
  orgId: string,
  values: ExamFormValues,
  actorProfileId?: string,
): Promise<ExamListItem> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const payload = {
    organization_id: orgId,
    group_id: values.group_id,
    teacher_id: values.teacher_id || null,
    title: values.title.trim(),
    subject: values.subject.trim(),
    exam_date: values.exam_date,
    maximum_score: Number(values.maximum_score) || 100,
  }

  const { data, error } = await supabase
    .from('exams')
    .insert(payload)
    .select(
      `
      id,
      organization_id,
      group_id,
      teacher_id,
      title,
      subject,
      exam_date,
      maximum_score,
      created_at,
      groups (
        name
      ),
      teachers (
        first_name,
        last_name
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
      action: 'exam.create',
      entityType: 'exam',
      entityId: data.id,
      metadata: { title: values.title, maximum_score: values.maximum_score },
    })
  }

  return {
    id: data.id,
    organization_id: data.organization_id,
    group_id: data.group_id,
    group_name: (data.groups as any)?.name || 'Guruh',
    teacher_id: data.teacher_id,
    teacher_name: (data.teachers as any)
      ? `${(data.teachers as any).first_name} ${(data.teachers as any).last_name}`
      : null,
    title: data.title,
    subject: data.subject,
    exam_date: data.exam_date,
    maximum_score: Number(data.maximum_score),
    results_count: 0,
    average_score: 0,
    highest_score: 0,
    created_at: data.created_at,
  }
}

export async function recordExamResultsBulk(
  orgId: string,
  examId: string,
  results: ExamResultInput[],
  actorProfileId?: string,
): Promise<{ savedCount: number }> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  // 1. Get exam maximum score
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('maximum_score')
    .eq('id', examId)
    .single()

  if (examError || !exam) {
    throw examError || new Error('Imtihon topilmadi.')
  }

  const maxScore = Number(exam.maximum_score) || 100

  // 2. Calculate percentage and grade for each result
  const rows = results.map((r) => {
    const score = Number(r.score) || 0
    const rawPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0
    const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage * 10) / 10))
    const grade = calculateGrade(percentage)

    return {
      organization_id: orgId,
      exam_id: examId,
      student_id: r.studentId,
      score,
      percentage,
      grade,
      teacher_comment: r.comment?.trim() || null,
      updated_at: new Date().toISOString(),
    }
  })

  const { error: upsertError } = await supabase
    .from('exam_results')
    .upsert(rows, { onConflict: 'exam_id,student_id' })

  if (upsertError) {
    throw upsertError
  }

  if (actorProfileId) {
    await recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'exam.record_results_bulk',
      entityType: 'exam_results',
      entityId: examId,
      metadata: { results_count: results.length },
    })
  }

  return { savedCount: rows.length }
}

export async function getExamLeaderboard(
  orgId: string,
  examId: string,
): Promise<StudentExamLeaderboard[]> {
  if (!supabase) {
    throw new Error('Supabase ulanmagan.')
  }

  const { data: exam } = await supabase
    .from('exams')
    .select('maximum_score')
    .eq('id', examId)
    .single()

  const maxScore = Number(exam?.maximum_score) || 100

  const { data: results, error } = await supabase
    .from('exam_results')
    .select(
      `
      score,
      percentage,
      grade,
      student_id,
      students (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('exam_id', examId)
    .order('score', { ascending: false })

  if (error) {
    throw error
  }

  const badges = ['🥇 1-oʼrin', '🥈 2-oʼrin', '🥉 3-oʼrin']

  return ((results ?? []) as any[]).map((r, index) => ({
    student_id: r.student_id,
    student_name: r.students ? `${r.students.first_name} ${r.students.last_name}` : "O'quvchi",
    avatar_url: r.students?.avatar_url ?? null,
    score: Number(r.score),
    maximum_score: maxScore,
    percentage: Number(r.percentage),
    grade: r.grade,
    rank: index + 1,
    badge: index < 3 ? badges[index] : undefined,
  }))
}
