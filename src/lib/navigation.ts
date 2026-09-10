import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpenText,
  CalendarCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  NotebookPen,
  ReceiptText,
  Send,
  Settings2,
  ShieldCheck,
  Users,
  UserRound,
  WalletCards,
} from 'lucide-react'
import type { AppRole } from '@/lib/auth/roles'

export type SidebarGroup =
  | 'main'
  | 'management'
  | 'education'
  | 'finance'
  | 'insights'
  | 'communication'
  | 'system'

export type NavigationItem = {
  label: string
  path: string
  icon: LucideIcon
  description: string
  roles: AppRole[]
  showInSidebar: boolean
  sidebarGroup: SidebarGroup
}

export type ModuleRoute = NavigationItem & {
  phaseLabel: string
  focusAreas: string[]
}

const teacherRole: AppRole[] = ['TEACHER']
const allRoles: AppRole[] = ['OWNER', 'ADMIN', 'TEACHER']

const sidebarGroupLabels: Record<SidebarGroup, string> = {
  main: 'Main',
  management: 'Management',
  education: 'Education',
  finance: 'Finance',
  insights: 'Insights',
  communication: 'Communication',
  system: 'System',
}

export const moduleRoutes: ModuleRoute[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    description: 'Operational overview and live system status.',
    roles: allRoles,
    showInSidebar: true,
    sidebarGroup: 'main',
    phaseLabel: 'Phase 4 - Shell',
    focusAreas: ['KPIs', 'Lessons', 'Notifications', 'Recent activity'],
  },
  {
    label: 'Students',
    path: '/students',
    icon: Users,
    description: 'Student records, profiles, and lifecycle status.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 5 - Students',
    focusAreas: ['Profiles', 'Status lifecycle', 'Notes and history', 'Parent links'],
  },
  {
    label: 'My Students',
    path: '/my-students',
    icon: Users,
    description: 'Your assigned student list and teaching roster.',
    roles: teacherRole,
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 5 - Teachers',
    focusAreas: ['Assigned learners', 'Attendance context', 'Homework context', 'Exam visibility'],
  },
  {
    label: 'Parents',
    path: '/parents',
    icon: UserRound,
    description: 'Parent contacts and Telegram verification state.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 5 - Parents',
    focusAreas: ['Contact records', 'Telegram linking', 'Notification preferences', 'Student relationships'],
  },
  {
    label: 'Teachers',
    path: '/teachers',
    icon: GraduationCap,
    description: 'Teacher profiles, specialization, and availability.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 5 - Teachers',
    focusAreas: ['Specialization', 'Availability', 'Contacts', 'Role-based access'],
  },
  {
    label: 'My Groups',
    path: '/my-groups',
    icon: Layers3,
    description: 'Your assigned learning groups.',
    roles: teacherRole,
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 6 - Teachers',
    focusAreas: ['Assigned groups', 'Schedules', 'Capacity view', 'Class context'],
  },
  {
    label: 'Groups',
    path: '/groups',
    icon: Layers3,
    description: 'Learning groups, schedules, and capacity.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 6 - Groups',
    focusAreas: ['Capacity', 'Schedules', 'Teacher assignment', 'Student membership'],
  },
  {
    label: 'Lessons',
    path: '/lessons',
    icon: BookOpenText,
    description: 'Lesson planning and session delivery.',
    roles: allRoles,
    showInSidebar: true,
    sidebarGroup: 'management',
    phaseLabel: 'Phase 6 - Lessons',
    focusAreas: ['Lesson planning', 'Teacher ownership', 'Session timestamps', 'Group context'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: CalendarCheck2,
    description: 'Daily attendance capture and bulk actions.',
    roles: allRoles,
    showInSidebar: true,
    sidebarGroup: 'education',
    phaseLabel: 'Phase 7 - Attendance',
    focusAreas: ['Bulk actions', 'Status capture', 'Filters', 'Notification queue integration'],
  },
  {
    label: 'Homework',
    path: '/homework',
    icon: NotebookPen,
    description: 'Homework creation and submission workflows.',
    roles: allRoles,
    showInSidebar: true,
    sidebarGroup: 'education',
    phaseLabel: 'Phase 10 - Homework',
    focusAreas: ['Assignments', 'Deadlines', 'Attachments', 'Submission tracking'],
  },
  {
    label: 'Exams & Results',
    path: '/exams',
    icon: FileText,
    description: 'Exam setup, grading, and teacher comments.',
    roles: allRoles,
    showInSidebar: true,
    sidebarGroup: 'education',
    phaseLabel: 'Phase 11 - Exams',
    focusAreas: ['Exam creation', 'Scoring', 'Teacher comments', 'Performance snapshots'],
  },
  {
    label: 'Results',
    path: '/results',
    icon: ShieldCheck,
    description: 'Performance summaries and report cards.',
    roles: allRoles,
    showInSidebar: false,
    sidebarGroup: 'education',
    phaseLabel: 'Phase 11 - Results',
    focusAreas: ['Grades', 'Percentages', 'Student history', 'Report visibility'],
  },
  {
    label: 'Payments',
    path: '/payments',
    icon: WalletCards,
    description: 'Revenue tracking, reminders, and balances.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'finance',
    phaseLabel: 'Phase 9 - Payments',
    focusAreas: ['Invoices', 'Balances', 'Reminders', 'Telegram nudges'],
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    description: 'Operational metrics and performance trends.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'insights',
    phaseLabel: 'Phase 12 - Analytics',
    focusAreas: ['Attendance rate', 'Revenue trends', 'Performance summaries', 'Operational insight'],
  },
  {
    label: 'Telegram',
    path: '/telegram',
    icon: Send,
    description: 'Parent connection and notification delivery.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'communication',
    phaseLabel: 'Phase 8 - Telegram',
    focusAreas: ['Parent verification', 'Webhook flow', 'Message queue', 'Retry handling'],
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: ReceiptText,
    description: 'Notification center and delivery history.',
    roles: teacherRole,
    showInSidebar: true,
    sidebarGroup: 'communication',
    phaseLabel: 'Phase 8 - Teachers',
    focusAreas: ['Delivery history', 'Unread alerts', 'Parent messages', 'Queued notifications'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings2,
    description: 'Organization configuration and access control.',
    roles: ['OWNER', 'ADMIN'],
    showInSidebar: true,
    sidebarGroup: 'system',
    phaseLabel: 'Phase 2 - Auth',
    focusAreas: ['Organization profile', 'Roles', 'Channels', 'Brand preferences'],
  },
]

export function getNavigationItems(role: AppRole | null): NavigationItem[] {
  if (!role) {
    return []
  }

  return moduleRoutes.filter((item) => item.showInSidebar && item.roles.includes(role))
}

export function getSidebarSections(role: AppRole | null) {
  const visibleItems = getNavigationItems(role)
  const sectionOrder: SidebarGroup[] = [
    'main',
    'management',
    'education',
    'finance',
    'insights',
    'communication',
    'system',
  ]

  return sectionOrder
    .map((section) => ({
      id: section,
      label: sidebarGroupLabels[section],
      items: visibleItems.filter((item) => item.sidebarGroup === section),
    }))
    .filter((section) => section.items.length > 0)
}

export function getModuleRoute(path: string): ModuleRoute | null {
  return moduleRoutes.find((item) => item.path === path) ?? null
}

export function getRouteTitle(path: string): string {
  if (path.startsWith('/students/')) {
    return 'Student detail'
  }

  if (path.startsWith('/parents/')) {
    return 'Parent detail'
  }

  if (path.startsWith('/teachers/')) {
    return 'Teacher detail'
  }

  if (path === '/account') {
    return 'Account'
  }

  if (path === '/unauthorized') {
    return 'Access restricted'
  }

  return getModuleRoute(path)?.label ?? 'Workspace'
}

export function getRouteSection(path: string): string | null {
  if (path.startsWith('/students/')) {
    return 'Management'
  }

  if (path.startsWith('/parents/')) {
    return 'Management'
  }

  if (path.startsWith('/teachers/')) {
    return 'Management'
  }

  if (path === '/account') {
    return 'System'
  }

  if (path === '/unauthorized') {
    return null
  }

  const route = getModuleRoute(path)
  return route ? sidebarGroupLabels[route.sidebarGroup] : null
}

export function getDefaultRoute(role: AppRole | null): string {
  if (!role) {
    return '/login'
  }

  return '/dashboard'
}

export function getRoleLandingPath(role: AppRole | null): string {
  return getDefaultRoute(role)
}

export function isTeacherRoute(path: string): boolean {
  return ['/my-groups', '/my-students', '/notifications'].includes(path)
}
