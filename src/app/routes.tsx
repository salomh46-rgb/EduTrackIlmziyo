import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/shell/AppShell'
import { AccountPage } from '@/pages/auth/AccountPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { NotFoundPage } from '@/pages/app/NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ModulePlaceholder } from '@/features/shared/ModulePlaceholder'
import { RequireAuth, RequireRole, PublicOnly } from '@/components/RouteGuard'
import { moduleRoutes } from '@/lib/navigation'
import { useAuth } from '@/lib/auth/auth'
import { hasAnyRole } from '@/lib/auth/roles'
import { StudentsPage } from '@/features/students/pages/StudentsPage'
import { StudentDetailPage } from '@/features/students/pages/StudentDetailPage'
import { ParentsPage } from '@/features/parents/pages/ParentsPage'
import { ParentDetailPage } from '@/features/parents/pages/ParentDetailPage'
import { TeachersPage } from '@/features/teachers/pages/TeachersPage'
import { TeacherDetailPage } from '@/features/teachers/pages/TeacherDetailPage'
import { ParentPortalPage } from '@/features/parent-portal'
import { PaymentsPage } from '@/features/finance/pages/PaymentsPage'
import { GroupsPage } from '@/features/groups/pages/GroupsPage'
import { GroupDetailPage } from '@/features/groups/pages/GroupDetailPage'
import { AttendancePage } from '@/features/attendance/pages/AttendancePage'
import { ExamsPage } from '@/features/exams/pages/ExamsPage'

function DashboardRedirect() {
  const { role } = useAuth()

  if (hasAnyRole(role, ['OWNER', 'ADMIN', 'TEACHER'])) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <RequireAuth>
            <UnauthorizedPage />
          </RequireAuth>
        }
      />
      <Route path="/parent-portal" element={<ParentPortalPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardRedirect />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route
          path="/students"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <StudentsPage />
            </RequireRole>
          }
        />
        <Route
          path="/students/:studentId"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <StudentDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="/parents"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <ParentsPage />
            </RequireRole>
          }
        />
        <Route
          path="/parents/:parentId"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <ParentDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="/teachers"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <TeachersPage />
            </RequireRole>
          }
        />
        <Route
          path="/teachers/:teacherId"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <TeacherDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="/payments"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <PaymentsPage initialTab="all" />
            </RequireRole>
          }
        />
        <Route
          path="/debtors"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN']}>
              <PaymentsPage initialTab="debtors" />
            </RequireRole>
          }
        />
        <Route
          path="/groups"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN', 'TEACHER']}>
              <GroupsPage />
            </RequireRole>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN', 'TEACHER']}>
              <GroupDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="/attendance"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN', 'TEACHER']}>
              <AttendancePage />
            </RequireRole>
          }
        />
        <Route
          path="/exams"
          element={
            <RequireRole allowedRoles={['OWNER', 'ADMIN', 'TEACHER']}>
              <ExamsPage />
            </RequireRole>
          }
        />
        {moduleRoutes
          .filter(
            (route) =>
              ![
                '/dashboard',
                '/students',
                '/parents',
                '/teachers',
                '/payments',
                '/debtors',
                '/groups',
                '/attendance',
                '/exams',
              ].includes(route.path),
          )
          .map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <RequireRole allowedRoles={route.roles}>
                  <ModulePlaceholder
                    title={route.label}
                    description={route.description}
                    phaseLabel={route.phaseLabel}
                    focusAreas={route.focusAreas}
                  />
                </RequireRole>
              }
            />
          ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
