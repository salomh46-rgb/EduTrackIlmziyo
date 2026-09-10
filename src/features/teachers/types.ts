export type TeacherStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type TeacherFormValues = {
  first_name: string
  last_name: string
  phone: string
  email: string
  specialization: string
  status: TeacherStatus
}

export type TeacherListItem = {
  id: string
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
  groups_count: number
}

export type TeacherDetail = TeacherListItem & {
  groups: Array<{ id: string; name: string; subject: string; status: string }>
}
