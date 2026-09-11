export type GroupStatus = 'ACTIVE' | 'ARCHIVED' | 'PLANNED' | 'PAUSED'

export type GroupSchedule = {
  days?: string[]
  time?: string
  raw?: string
}

export type GroupTeacherSummary = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email?: string | null
  avatar_url: string | null
  specialization: string | null
}

export type GroupStudent = {
  id: string
  student_id: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  status: string
  joined_at: string
  left_at: string | null
}

export type GroupListItem = {
  id: string
  organization_id: string
  name: string
  subject: string
  teacher_id: string | null
  teacher: GroupTeacherSummary | null
  room: string | null
  schedule: GroupSchedule | null
  capacity: number
  status: GroupStatus
  student_count: number
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export type GroupDetail = GroupListItem & {
  students: GroupStudent[]
}

export type GroupFormValues = {
  name: string
  subject: string
  teacher_id: string
  room: string
  schedule_days: string[]
  schedule_time: string
  capacity: number
  status: GroupStatus
}
