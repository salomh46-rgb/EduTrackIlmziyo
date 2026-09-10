export const appRoles = ['OWNER', 'ADMIN', 'TEACHER'] as const

export type AppRole = (typeof appRoles)[number]

export function isAppRole(value: string | null | undefined): value is AppRole {
  return value === 'OWNER' || value === 'ADMIN' || value === 'TEACHER'
}

export function hasRole(role: AppRole | null | undefined, requiredRole: AppRole): boolean {
  return role === requiredRole
}

export function hasAnyRole(role: AppRole | null | undefined, allowedRoles: AppRole[]): boolean {
  return role ? allowedRoles.includes(role) : false
}

export type Permission =
  | 'dashboard:view'
  | 'students:view'
  | 'parents:view'
  | 'teachers:view'
  | 'groups:view'
  | 'lessons:view'
  | 'attendance:view'
  | 'homework:view'
  | 'exams:view'
  | 'results:view'
  | 'payments:view'
  | 'analytics:view'
  | 'telegram:view'
  | 'settings:view'
  | 'account:view'

const permissionMatrix: Record<AppRole, Permission[]> = {
  OWNER: [
    'dashboard:view',
    'students:view',
    'parents:view',
    'teachers:view',
    'groups:view',
    'lessons:view',
    'attendance:view',
    'homework:view',
    'exams:view',
    'results:view',
    'payments:view',
    'analytics:view',
    'telegram:view',
    'settings:view',
    'account:view',
  ],
  ADMIN: [
    'dashboard:view',
    'students:view',
    'parents:view',
    'teachers:view',
    'groups:view',
    'lessons:view',
    'attendance:view',
    'homework:view',
    'exams:view',
    'results:view',
    'payments:view',
    'analytics:view',
    'telegram:view',
    'account:view',
  ],
  TEACHER: [
    'dashboard:view',
    'groups:view',
    'lessons:view',
    'attendance:view',
    'homework:view',
    'exams:view',
    'results:view',
    'telegram:view',
    'account:view',
  ],
}

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) {
    return false
  }

  return permissionMatrix[role].includes(permission)
}

