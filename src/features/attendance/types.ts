export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'

export type AttendanceRecord = {
  id?: string
  student_id: string
  status: AttendanceStatus
  note?: string
}

export type LessonWithAttendance = {
  id: string
  group_id: string
  group_name: string
  subject: string
  teacher_id: string | null
  teacher_name: string | null
  starts_at: string
  ends_at: string | null
  status: string
  room: string | null
}

export type AttendanceStats = {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  rate: number // 0 - 100 percentage
}

export type AttendanceRosterStudent = {
  student_id: string
  student_name: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  status: AttendanceStatus
  note: string
  attendance_id?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  telegram_verified?: boolean
  parent_id?: string | null
}

export type AttendanceSummary = AttendanceStats & {
  period_start: string
  period_end: string
}
