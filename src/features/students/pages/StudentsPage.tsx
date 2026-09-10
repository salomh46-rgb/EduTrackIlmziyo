import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Filter, Plus, Search, Users } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Select } from '@/components/Select'
import { Drawer } from '@/components/Drawer'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import {
  archiveStudent,
  createStudent,
  getFriendlyStudentError,
  listStudentGroups,
  listStudents,
  updateStudent,
} from '@/features/students/api/studentsApi'
import type { StudentFormValues, StudentListItem, StudentStatus } from '@/features/students/types'
import { StudentFormDrawer } from '@/features/students/components/StudentFormDrawer'

const pageSize = 10
const statusOptions: Array<StudentStatus | 'ALL'> = ['ALL', 'ACTIVE', 'INACTIVE', 'FROZEN', 'GRADUATED', 'LEFT']

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value))
}

function getStudentTitle(student: StudentListItem) {
  return `${student.first_name} ${student.last_name}`.trim()
}

function studentFormFromItem(student: StudentListItem): StudentFormValues {
  return {
    first_name: student.first_name,
    last_name: student.last_name,
    phone: student.phone ?? '',
    birth_date: student.birth_date ?? '',
    gender: (student.gender as StudentFormValues['gender']) ?? '',
    status: student.status,
    notes: student.notes ?? '',
  }
}

function studentStatusTone(status: StudentStatus | 'ARCHIVED') {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'INACTIVE':
      return 'warning'
    case 'FROZEN':
      return 'warning'
    case 'GRADUATED':
      return 'primary'
    case 'LEFT':
      return 'neutral'
    default:
      return 'danger'
  }
}

export function StudentsPage() {
  const navigate = useNavigate()
  const { profile, role, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()
  const [rows, setRows] = useState<StudentListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StudentStatus | 'ALL'>('ALL')
  const [groupId, setGroupId] = useState<string | 'ALL'>('ALL')
  const [page, setPage] = useState(0)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<StudentListItem | null>(null)

  useEffect(() => {
    let active = true

    async function loadGroups() {
      if (!organization?.id) {
        return
      }

      try {
        const data = await listStudentGroups(organization.id)
        if (!active) {
          return
        }
        setGroups(data.map((group) => ({ id: group.id, name: group.name })))
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load groups.')
      }
    }

    void loadGroups()

    return () => {
      active = false
    }
  }, [organization?.id])

  useEffect(() => {
    let active = true

    async function loadStudents() {
      if (!isSupabaseConfigured || !organization?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await listStudents({
          organizationId: organization.id,
          page,
          pageSize,
          search,
          status,
          groupId,
        })

        if (!active) {
          return
        }

        setRows(result.rows)
        setTotalCount(result.totalCount)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load students.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadStudents()

    return () => {
      active = false
    }
  }, [groupId, isSupabaseConfigured, organization?.id, page, search, status])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const activeStudent = useMemo(() => selectedStudent, [selectedStudent])

  const openCreate = () => {
    setDrawerMode('create')
    setSelectedStudent(null)
    setDrawerError(null)
  }

  const openEdit = (student: StudentListItem) => {
    setSelectedStudent(student)
    setDrawerMode('edit')
    setDrawerError(null)
  }

  const closeDrawer = () => {
    setDrawerMode(null)
    setSelectedStudent(null)
    setDrawerError(null)
  }

  const refreshStudents = async () => {
    if (!organization?.id) {
      return
    }

    const result = await listStudents({
      organizationId: organization.id,
      page,
      pageSize,
      search,
      status,
      groupId,
    })
    setRows(result.rows)
    setTotalCount(result.totalCount)
  }

  const submitStudent = async (values: StudentFormValues) => {
    if (!organization?.id || !profile?.id) {
      return
    }

    try {
      setDrawerBusy(true)
      if (drawerMode === 'edit' && activeStudent) {
        await updateStudent(organization.id, profile.id, activeStudent.id, values)
      } else {
        await createStudent(organization.id, profile.id, values)
      }
      await refreshStudents()
      closeDrawer()
    } catch (submitError) {
      setDrawerError(
        submitError && typeof submitError === 'object' && 'code' in submitError
          ? getFriendlyStudentError(submitError as Parameters<typeof getFriendlyStudentError>[0])
          : submitError instanceof Error
            ? submitError.message
            : 'Failed to save student.',
      )
    } finally {
      setDrawerBusy(false)
    }
  }

  const confirmArchive = async () => {
    if (!organization?.id || !profile?.id || !archiveTarget) {
      return
    }

    try {
      setDrawerBusy(true)
      await archiveStudent(organization.id, profile.id, archiveTarget.id)
      await refreshStudents()
      setArchiveTarget(null)
    } catch (archiveError) {
      setDrawerError(
        archiveError instanceof Error ? archiveError.message : 'Failed to archive student.',
      )
    } finally {
      setDrawerBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <StateScreen
        title="Supabase is not configured"
        description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the Students CRM."
      />
    )
  }

  if (orgLoading) {
    return <LoadingState title="Loading students" description="Loading organization context and student records." />
  }

  if (orgError || !organization) {
    return (
      <StateScreen
        title="Workspace not ready"
        description={orgError ?? 'We could not resolve an active organization for the current user.'}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Students"
        title="Manage students and family relationships"
        description="Browse students, filter by status or group, open detail records, and manage parent links without leaving the CRM."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add student
            </Button>
          </>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.6fr_0.6fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[rgb(var(--muted))]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(0)
              }}
              className="!h-auto !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
              placeholder="Search students by name or phone"
            />
          </label>

          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StudentStatus | 'ALL')
              setPage(0)
            }}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All statuses' : option}
              </option>
            ))}
          </Select>

          <Select
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value)
              setPage(0)
            }}
          >
            <option value="ALL">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>

          <Button type="button" variant="secondary" onClick={() => {
            setSearch('')
            setStatus('ALL')
            setGroupId('ALL')
            setPage(0)
          }}>
            <Filter className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-[rgb(var(--muted))]">
          <span>
            {totalCount} student{totalCount === 1 ? '' : 's'} found
          </span>
          <span>
            Page {page + 1} of {totalPages}
          </span>
        </div>
      </Card>

      {error ? (
        <Card className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <LoadingState title="Loading students" description="Fetching student records from Supabase." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add the first student record to begin managing family relationships and group assignments."
          icon={<Users className="h-5 w-5" />}
          action={
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add student
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] md:block">
            <table className="min-w-full divide-y divide-[rgb(var(--border))]">
              <thead className="bg-[rgb(var(--surface-soft))] text-left text-xs font-bold uppercase tracking-[0.24em] text-[rgb(var(--muted))]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {rows.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-sm font-black text-blue-600">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt={getStudentTitle(student)} className="h-full w-full rounded-2xl object-cover" />
                          ) : (
                            getStudentTitle(student)
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          )}
                        </div>
                        <div>
                          <Link to={`/students/${student.id}`} className="font-semibold hover:text-[rgb(var(--primary))]">
                            {getStudentTitle(student)}
                          </Link>
                          <p className="text-xs text-[rgb(var(--muted))]">
                            {student.gender ?? 'No gender'} · {student.parent_count} parent{student.parent_count === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">{student.primary_group?.name ?? 'No group'}</td>
                    <td className="px-4 py-4 text-sm">
                      {student.primary_parent ? `${student.primary_parent.first_name} ${student.primary_parent.last_name}` : 'No parent'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={studentStatusTone(student.status)}>{student.is_deleted ? 'ARCHIVED' : student.status}</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">{student.phone ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-[rgb(var(--muted))]">{formatDate(student.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => navigate(`/students/${student.id}`)}>
                          View
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => openEdit(student)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setArchiveTarget(student)}>
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {rows.map((student) => (
              <Card key={student.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Link to={`/students/${student.id}`} className="text-base font-bold hover:text-[rgb(var(--primary))]">
                      {getStudentTitle(student)}
                    </Link>
                    <p className="text-sm text-[rgb(var(--muted))]">
                      {student.primary_group?.name ?? 'No group'} · {student.phone ?? 'No phone'}
                    </p>
                  </div>
                  <Badge variant={studentStatusTone(student.status)}>{student.is_deleted ? 'ARCHIVED' : student.status}</Badge>
                </div>
                <div className="grid gap-2 text-sm text-[rgb(var(--muted))]">
                  <div>Parent: {student.primary_parent ? `${student.primary_parent.first_name} ${student.primary_parent.last_name}` : 'No parent'}</div>
                  <div>Created: {formatDate(student.created_at)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/students/${student.id}`)}>
                    View
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => openEdit(student)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setArchiveTarget(student)}>
                    Archive
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <StudentFormDrawer
        open={drawerMode !== null}
        mode={drawerMode ?? 'create'}
        onClose={closeDrawer}
        onSubmit={submitStudent}
        busy={drawerBusy}
        error={drawerError}
        initialValues={selectedStudent ? studentFormFromItem(selectedStudent) : undefined}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive student"
        description={`Archive ${archiveTarget ? getStudentTitle(archiveTarget) : 'this student'}? The record stays in the database, but it will disappear from active lists.`}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        busy={drawerBusy}
        confirmLabel="Archive"
      />
    </div>
  )
}
