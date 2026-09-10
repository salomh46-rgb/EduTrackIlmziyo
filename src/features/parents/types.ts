import type { RelationshipType } from '@/features/students/types'

export type ParentFormValues = {
  first_name: string
  last_name: string
  phone: string
  email: string
}

export type ParentStudentSummary = {
  link_id: string
  id: string
  first_name: string
  last_name: string
  phone: string | null
  group_name: string | null
  relationship_type: RelationshipType
  is_primary: boolean
}

export type ParentListItem = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  notification_enabled: boolean
  telegram_verified: boolean
  telegram_username: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  child_count: number
}

export type ParentDetail = ParentListItem & {
  children: ParentStudentSummary[]
}
