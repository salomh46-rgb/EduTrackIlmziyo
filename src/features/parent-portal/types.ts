// Telegram WebApp and Parent Portal Domain Types

export type TelegramThemeParams = {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

export type TelegramMainButton = {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  setText: (text: string) => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
  show: () => void
  hide: () => void
  enable: () => void
  disable: () => void
  showProgress: (leaveActive?: boolean) => void
  hideProgress: () => void
}

export type TelegramBackButton = {
  isVisible: boolean
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
  show: () => void
  hide: () => void
}

export type TelegramHapticFeedback = {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

export type TelegramWebApp = {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    auth_date?: number
    hash?: string
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  BackButton: TelegramBackButton
  MainButton: TelegramMainButton
  HapticFeedback: TelegramHapticFeedback
  ready: () => void
  expand: () => void
  close: () => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  openTelegramLink: (url: string) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT'

export type ParentPortalAttendanceItem = {
  id: string
  lesson_date: string
  status: AttendanceStatus
  topic?: string | null
  lesson_title?: string | null
  note?: string | null
}

export type ParentPortalExamItem = {
  id: string
  title: string
  subject: string
  exam_date: string
  score: number
  maximum_score: number
  percentage: number
  grade: string
  teacher_comment?: string | null
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL'

export type ParentPortalPaymentItem = {
  id: string
  amount: number
  payment_date?: string | null
  due_date?: string | null
  status: PaymentStatus
  method?: string | null
  note?: string | null
  receipt_id?: string | null
}

export type ParentPortalPaymentSummary = {
  balance_amount: number
  total_paid: number
  total_due: number
  next_due_date?: string | null
  last_payment_date?: string | null
  currency: string
  is_overdue: boolean
  history: ParentPortalPaymentItem[]
}

export type ParentPortalStudentProfile = {
  id: string
  first_name: string
  last_name: string
  full_name: string
  avatar_url?: string | null
  phone?: string | null
  group_name: string
  subject: string
  teacher_name?: string | null
  attendance_rate: number
  average_score: number
  total_attended_lessons: number
  total_scheduled_lessons: number
}

export type ParentPortalOrganization = {
  id: string
  name: string
  phone: string
  address: string
  support_telegram?: string
}

export type ParentPortalData = {
  student: ParentPortalStudentProfile
  attendance: ParentPortalAttendanceItem[]
  exams: ParentPortalExamItem[]
  finance: ParentPortalPaymentSummary
  organization: ParentPortalOrganization
  is_demo: boolean
  parent_name?: string | null
}
