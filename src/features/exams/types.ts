export type ExamListItem = {
  id: string
  organization_id: string
  group_id: string
  group_name: string
  teacher_id: string | null
  teacher_name: string | null
  title: string
  subject: string
  exam_date: string
  maximum_score: number
  results_count: number
  average_score: number
  highest_score: number
  created_at: string
}

export type ExamResultItem = {
  id?: string
  student_id: string
  student_name: string
  first_name: string
  last_name: string
  avatar_url: string | null
  score: number
  percentage: number
  grade: string
  teacher_comment: string | null
}

export type ExamDetail = ExamListItem & {
  results: ExamResultItem[]
}

export type ExamResultInput = {
  studentId: string
  score: number
  comment?: string
}

export type StudentExamLeaderboard = {
  student_id: string
  student_name: string
  avatar_url: string | null
  score: number
  maximum_score: number
  percentage: number
  grade: string
  rank: number
  badge?: string
}

export type ExamFormValues = {
  title: string
  subject: string
  group_id: string
  teacher_id: string
  exam_date: string
  maximum_score: number
}
