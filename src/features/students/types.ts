export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'GRADUATED' | 'LEFT'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export type RelationshipType = 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER'

export type StudentFormValues = {
  first_name: string
  last_name: string
  phone: string
  birth_date: string
  gender: Gender | ''
  status: StudentStatus
  notes: string
}

export type StudentParentSummary = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  notification_enabled: boolean
  telegram_verified: boolean
}

export type StudentGroupSummary = {
  id: string
  name: string
  subject: string
  status: string
}

export type StudentListItem = {
  id: string
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
  primary_group: StudentGroupSummary | null
  primary_parent: StudentParentSummary | null
  parent_count: number
  group_count: number
}

export type StudentDetail = StudentListItem & {
  parents: Array<
    StudentParentSummary & {
      link_id: string
      relationship_type: RelationshipType
      is_primary: boolean
    }
  >
  groups: Array<{
    id: string
    name: string
    subject: string
    status: string
    joined_at: string
    left_at: string | null
  }>
}

export type StudentUpsertInput = StudentFormValues

export type StudentParentLink = {
  parent_id: string
  relationship_type: RelationshipType
  is_primary: boolean
}
