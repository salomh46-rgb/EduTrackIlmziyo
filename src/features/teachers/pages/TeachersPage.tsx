import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Filter, Plus, Search, Users } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Select } from '@/components/Select'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import { TeacherFormDrawer } from '@/features/teachers/components/TeacherFormDrawer'
import { archiveTeacher, createTeacher, formatTeacherError, listTeachers, updateTeacher } from '@/features/teachers/api/teachersApi'
import type { TeacherFormValues, TeacherListItem, TeacherStatus } from '@/features/teachers/types'

const pageSize = 10
const statusOptions: Array<TeacherStatus | 'ALL'> = ['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED']

function teacherTitle(teacher: TeacherListItem) {
  return `${teacher.first_name} ${teacher.last_name}`.trim()
}

function formFromTeacher(teacher: TeacherListItem): TeacherFormValues {
  return {
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    phone: teacher.phone ?? '',
    email: teacher.email ?? '',
    specialization: teacher.specialization ?? '',
    status: teacher.status,
  }
}

export function TeachersPage() {
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()
  const [rows, setRows] = useState<TeacherListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TeacherStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(0)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherListItem | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<TeacherListItem | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!organization?.id || !isSupabaseConfigured) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await listTeachers(organization.id, { page, pageSize, search, status })
        if (!active) {
          return
        }
        setRows(result.rows)
        setTotalCount(result.totalCount)
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load teachers.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [isSupabaseConfigured, organization?.id, page, search, status])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const activeTeacher = useMemo(() => selectedTeacher, [selectedTeacher])

  const refresh = async () => {
    if (!organization?.id) {
      return
    }
    const result = await listTeachers(organization.id, { page, pageSize, search, status })
    setRows(result.rows)
    setTotalCount(result.totalCount)
  }

  const submitTeacher = async (values: TeacherFormValues) => {
    if (!organization?.id || !profile?.id) {
      return
    }
    try {
      setDrawerBusy(true)
      if (drawerMode === 'edit' && activeTeacher) {
        await updateTeacher(organization.id, profile.id, activeTeacher.id, values)
      } else {
        await createTeacher(organization.id, profile.id, values)
      }
      await refresh()
      setDrawerMode(null)
      setSelectedTeacher(null)
    } catch (submitError) {
      setDrawerError(
        submitError && typeof submitError === 'object' && 'code' in submitError
          ? formatTeacherError(submitError as Parameters<typeof formatTeacherError>[0])
          : submitError instanceof Error
            ? submitError.message
            : 'Failed to save teacher.',
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
      await archiveTeacher(organization.id, profile.id, archiveTarget.id)
      await refresh()
      setArchiveTarget(null)
    } catch (archiveError) {
      setDrawerError(archiveError instanceof Error ? archiveError.message : 'Failed to archive teacher.')
    } finally {
      setDrawerBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <LoadingState title="Supabase configuration required" description="Configure Supabase to use the Teachers CRM." />
  }

  if (orgLoading) {
    return <LoadingState title="Loading teachers" description="Loading organization context and teacher records." />
  }

  if (orgError || !organization) {
    return <EmptyState title="Workspace not ready" description={orgError ?? 'We could not resolve an active organization for the current user.'} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Teachers"
        title="Manage teaching staff"
        description="Track teaching staff, specialization, and status without creating authentication accounts."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading}>
              Previous
            </Button>
            <Button type="button" onClick={() => {
              setDrawerMode('create')
              setSelectedTeacher(null)
              setDrawerError(null)
            }}>
              <Plus className="h-4 w-4" />
              Add teacher
            </Button>
          </>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[rgb(var(--muted))]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(0)
              }}
              className="!h-auto !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
              placeholder="Search teachers by name, phone, or specialization"
            />
          </label>
          <Select value={status} onChange={(event) => { setStatus(event.target.value as TeacherStatus | 'ALL'); setPage(0) }}>
            {statusOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All statuses' : option}</option>)}
          </Select>
          <Button type="button" variant="secondary" onClick={() => { setSearch(''); setStatus('ALL'); setPage(0) }}>
            <Filter className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-[rgb(var(--muted))]">
          <span>{totalCount} teacher{totalCount === 1 ? '' : 's'} found</span>
          <span>Page {page + 1} of {totalPages}</span>
        </div>
      </Card>

      {error ? <Card className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</Card> : null}

      {loading ? (
        <LoadingState title="Loading teachers" description="Fetching teacher records from Supabase." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No teachers yet"
          description="Add the first teacher record to begin tracking specialization and assignments."
          icon={<Users className="h-5 w-5" />}
          action={<Button type="button" onClick={() => setDrawerMode('create')}><Plus className="h-4 w-4" />Add teacher</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((teacher) => (
            <Card key={teacher.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link to={`/teachers/${teacher.id}`} className="text-lg font-bold hover:text-[rgb(var(--primary))]">
                    {teacherTitle(teacher)}
                  </Link>
                  <p className="text-sm text-[rgb(var(--muted))]">{teacher.specialization ?? 'No specialization'} · {teacher.phone ?? 'No phone'}</p>
                </div>
                <Badge variant={teacher.status === 'ACTIVE' ? 'success' : teacher.status === 'INACTIVE' ? 'warning' : 'neutral'}>
                  {teacher.is_deleted ? 'ARCHIVED' : teacher.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-[rgb(var(--muted))]">Groups: <span className="font-semibold text-[rgb(var(--text))]">{teacher.groups_count}</span></span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/teachers/${teacher.id}`)}>View</Button>
                  <Button type="button" variant="secondary" onClick={() => { setSelectedTeacher(teacher); setDrawerMode('edit'); setDrawerError(null) }}>Edit</Button>
                  <Button type="button" variant="ghost" onClick={() => setArchiveTarget(teacher)}>Archive</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</Button>
          <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1}>Next<ArrowRight className="h-4 w-4" /></Button>
        </div>
      ) : null}

      <TeacherFormDrawer
        open={drawerMode !== null}
        mode={drawerMode ?? 'create'}
        onClose={() => {
          setDrawerMode(null)
          setSelectedTeacher(null)
          setDrawerError(null)
        }}
        onSubmit={submitTeacher}
        busy={drawerBusy}
        error={drawerError}
        initialValues={selectedTeacher ? formFromTeacher(selectedTeacher) : undefined}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive teacher"
        description={`Archive ${archiveTarget ? teacherTitle(archiveTarget) : 'this teacher'}? The record stays in the database for history and assignments.`}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        busy={drawerBusy}
        confirmLabel="Archive"
      />
    </div>
  )
}
