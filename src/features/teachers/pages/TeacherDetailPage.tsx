import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import { archiveTeacher, getTeacherDetail, updateTeacher } from '@/features/teachers/api/teachersApi'
import type { TeacherDetail, TeacherFormValues } from '@/features/teachers/types'
import { TeacherFormDrawer } from '@/features/teachers/components/TeacherFormDrawer'

function teacherTitle(teacher: TeacherDetail | null) {
  return teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : 'Teacher'
}

function formFromTeacher(teacher: TeacherDetail): TeacherFormValues {
  return {
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    phone: teacher.phone ?? '',
    email: teacher.email ?? '',
    specialization: teacher.specialization ?? '',
    status: teacher.status,
  }
}

export function TeacherDetailPage() {
  const { teacherId } = useParams()
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading } = useWorkspaceOrganization()
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadTeacher = async () => {
    if (!organization?.id || !teacherId) {
      return
    }
    const detail = await getTeacherDetail(organization.id, teacherId)
    setTeacher(detail)
  }

  useEffect(() => {
    let active = true
    async function load() {
      if (!organization?.id || !teacherId || !isSupabaseConfigured) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const detail = await getTeacherDetail(organization.id, teacherId)
        if (!active) {
          return
        }
        setTeacher(detail)
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load teacher.')
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
  }, [isSupabaseConfigured, organization?.id, teacherId])

  const submitTeacher = async (values: TeacherFormValues) => {
    if (!organization?.id || !profile?.id || !teacher) {
      return
    }
    try {
      setBusy(true)
      await updateTeacher(organization.id, profile.id, teacher.id, values)
      await loadTeacher()
      setEditOpen(false)
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Failed to update teacher.')
    } finally {
      setBusy(false)
    }
  }

  const handleArchive = async () => {
    if (!organization?.id || !profile?.id || !teacher) {
      return
    }
    try {
      setBusy(true)
      await archiveTeacher(organization.id, profile.id, teacher.id)
      navigate('/teachers', { replace: true })
    } catch (archiveError) {
      setActionError(archiveError instanceof Error ? archiveError.message : 'Failed to archive teacher.')
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <StateScreen title="Supabase is not configured" description="Set Supabase env vars to use the teacher detail page." />
  }
  if (orgLoading || loading) {
    return <LoadingState title="Loading teacher" description="Fetching teacher profile and assignments." />
  }
  if (error || !teacher) {
    return (
      <StateScreen
        title="Teacher not found"
        description={error ?? 'The teacher record is missing or you do not have access to it.'}
        actions={<Button type="button" variant="secondary" onClick={() => navigate('/teachers')}><ArrowLeft className="h-4 w-4" />Back to teachers</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Teacher detail"
        title={teacherTitle(teacher)}
        description="Profile, contact, specialization, and assigned groups."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/teachers')}>
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button type="button" onClick={handleArchive}>Archive</Button>
          </>
        }
      />

      {actionError ? <Card className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">{actionError}</Card> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-[rgb(var(--muted))]">Full name</p><p className="font-semibold">{teacher.first_name} {teacher.last_name}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Status</p><Badge variant={teacher.status === 'ACTIVE' ? 'success' : teacher.status === 'INACTIVE' ? 'warning' : 'neutral'} className="mt-1">{teacher.is_deleted ? 'ARCHIVED' : teacher.status}</Badge></div>
            <div><p className="text-[rgb(var(--muted))]">Email</p><p className="font-semibold">{teacher.email ?? '—'}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Phone</p><p className="font-semibold">{teacher.phone ?? '—'}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Specialization</p><p className="font-semibold">{teacher.specialization ?? '—'}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Groups</p><p className="font-semibold">{teacher.groups_count}</p></div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Assigned groups</h2>
          {teacher.groups.length === 0 ? (
            <EmptyState title="No groups assigned" description="Assignments will appear here once groups are linked in a later phase." icon={<Users className="h-5 w-5" />} />
          ) : (
            <div className="space-y-3">
              {teacher.groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
                  <div>
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-sm text-[rgb(var(--muted))]">{group.subject}</p>
                  </div>
                  <Badge variant="neutral">{group.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <TeacherFormDrawer
        open={editOpen}
        mode="edit"
        onClose={() => setEditOpen(false)}
        onSubmit={submitTeacher}
        busy={busy}
        error={actionError}
        initialValues={formFromTeacher(teacher)}
      />
    </div>
  )
}
