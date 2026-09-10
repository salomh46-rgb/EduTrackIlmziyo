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
        {moduleRoutes
          .filter((route) => !['/dashboard', '/students', '/parents', '/teachers'].includes(route.path))
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
