import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Link2, Plus, UserRound } from 'lucide-react'
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
import {
  archiveStudent,
  getFriendlyStudentError,
  getStudentDetail,
  linkParentToStudent,
  listAvailableParents,
  unlinkParentFromStudent,
} from '@/features/students/api/studentsApi'
import type { RelationshipType, StudentDetail, StudentFormValues, StudentParentSummary } from '@/features/students/types'
import { StudentFormDrawer } from '@/features/students/components/StudentFormDrawer'
import { StudentLinkParentDrawer } from '@/features/students/components/StudentLinkParentDrawer'
import { updateStudent } from '@/features/students/api/studentsApi'

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

function studentTitle(student: StudentDetail | null) {
  return student ? `${student.first_name} ${student.last_name}`.trim() : 'Student'
}

function formFromDetail(student: StudentDetail): StudentFormValues {
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

export function StudentDetailPage() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading } = useWorkspaceOrganization()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<{ linkId: string; parentId: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [availableParents, setAvailableParents] = useState<StudentParentSummary[]>([])

  const loadStudent = async () => {
    if (!organization?.id || !studentId) {
      return
    }

    const result = await getStudentDetail(organization.id, studentId)
    setStudent(result)
  }

  useEffect(() => {
    let active = true

    async function load() {
      if (!organization?.id || !studentId || !isSupabaseConfigured) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const detail = await getStudentDetail(organization.id, studentId)
        if (!active) {
          return
        }

        setStudent(detail)
        const parents = await listAvailableParents(organization.id)
        if (!active) {
          return
        }

        setAvailableParents(
          parents.map((parent) => {
            const telegram = parent.telegram_accounts?.[0]
            return {
              id: parent.id,
              first_name: parent.first_name,
              last_name: parent.last_name,
              phone: parent.phone,
              email: parent.email,
              notification_enabled: parent.notification_enabled,
              telegram_verified: Boolean(telegram?.is_verified),
            }
          }),
        )
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load student.')
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
  }, [isSupabaseConfigured, organization?.id, studentId])

  const linkedParentIds = useMemo(() => student?.parents.map((parent) => parent.id) ?? [], [student])

  const submitStudent = async (values: StudentFormValues) => {
    if (!organization?.id || !profile?.id || !student) {
      return
    }

    try {
      setBusy(true)
      await updateStudent(organization.id, profile.id, student.id, values)
      await loadStudent()
      setEditOpen(false)
    } catch (submitError) {
      setActionError(
        submitError && typeof submitError === 'object' && 'code' in submitError
          ? getFriendlyStudentError(submitError as Parameters<typeof getFriendlyStudentError>[0])
          : submitError instanceof Error
            ? submitError.message
            : 'Failed to update student.',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleArchive = async () => {
    if (!organization?.id || !profile?.id || !student) {
      return
    }

    try {
      setBusy(true)
      await archiveStudent(organization.id, profile.id, student.id)
      navigate('/students', { replace: true })
    } catch (archiveError) {
      setActionError(archiveError instanceof Error ? archiveError.message : 'Failed to archive student.')
    } finally {
      setBusy(false)
    }
  }

  const handleLinkParent = async (values: { parentId: string; relationshipType: RelationshipType; isPrimary: boolean }) => {
    if (!organization?.id || !profile?.id || !student) {
      return
    }

    try {
      setBusy(true)
      await linkParentToStudent(organization.id, profile.id, {
        studentId: student.id,
        parentId: values.parentId,
        relationshipType: values.relationshipType,
        isPrimary: values.isPrimary,
      })
      await loadStudent()
      setLinkOpen(false)
    } catch (linkError) {
      setActionError(linkError instanceof Error ? linkError.message : 'Failed to link parent.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlinkParent = async () => {
    if (!organization?.id || !profile?.id || !student || !unlinkTarget) {
      return
    }

    try {
      setBusy(true)
      await unlinkParentFromStudent(organization.id, profile.id, unlinkTarget.linkId, student.id, unlinkTarget.parentId)
      await loadStudent()
      setUnlinkTarget(null)
    } catch (unlinkError) {
      setActionError(unlinkError instanceof Error ? unlinkError.message : 'Failed to unlink parent.')
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <StateScreen
        title="Supabase is not configured"
        description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use the student detail page."
      />
    )
  }

  if (orgLoading || loading) {
    return <LoadingState title="Loading student" description="Fetching student profile and relationships." />
  }

  if (error || !student) {
    return (
      <StateScreen
        title="Student not found"
        description={error ?? 'The student record is missing or you do not have access to it.'}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate('/students')}>
            <ArrowLeft className="h-4 w-4" />
            Back to students
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Student detail"
        title={studentTitle(student)}
        description="Profile, relationship, and status information from Supabase."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/students')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button type="button" onClick={handleArchive}>
              Archive
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {['Overview', 'Attendance', 'Homework', 'Results', 'Payments', 'Activity'].map((tab, index) => (
          <Badge key={tab} variant={index === 0 ? 'primary' : 'neutral'} className="px-4 py-2">
            {tab}
          </Badge>
        ))}
      </div>

      {actionError ? <Card className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">{actionError}</Card> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[rgb(var(--muted))]">Full name</p>
              <p className="font-semibold">{student.first_name} {student.last_name}</p>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Status</p>
              <Badge variant="primary" className="mt-1">{student.status}</Badge>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Gender</p>
              <p className="font-semibold">{student.gender ?? 'Unknown'}</p>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Birth date</p>
              <p className="font-semibold">{formatDate(student.birth_date)}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[rgb(var(--muted))]">Created</p>
              <p className="font-semibold">{formatDate(student.created_at)}</p>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Updated</p>
              <p className="font-semibold">{formatDate(student.updated_at)}</p>
            </div>
          </div>
          {student.notes ? (
            <div>
              <p className="text-sm font-semibold">Notes</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{student.notes}</p>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Contact and assignment</h2>
            <Badge variant="neutral">{student.group_count} group{student.group_count === 1 ? '' : 's'}</Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[rgb(var(--muted))]">Phone</p>
              <p className="font-semibold">{student.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Primary group</p>
              <p className="font-semibold">{student.primary_group?.name ?? 'No group'}</p>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Primary parent</p>
              <p className="font-semibold">
                {student.primary_parent ? `${student.primary_parent.first_name} ${student.primary_parent.last_name}` : 'No parent'}
              </p>
            </div>
            <div>
              <p className="text-[rgb(var(--muted))]">Parent links</p>
              <p className="font-semibold">{student.parent_count}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Parents</h2>
            <Button type="button" variant="secondary" onClick={() => setLinkOpen(true)}>
              <Plus className="h-4 w-4" />
              Link parent
            </Button>
          </div>
          {student.parents.length === 0 ? (
            <EmptyState
              title="No parents linked"
              description="Link at least one parent or guardian to support contact and notification workflows."
              icon={<UserRound className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {student.parents.map((parent) => (
                <div
                  key={parent.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">
                      {parent.first_name} {parent.last_name}
                    </p>
                    <p className="text-sm text-[rgb(var(--muted))]">
                      {parent.relationship_type}
                      {parent.is_primary ? ' · Primary' : ''}
                      {parent.phone ? ` · ${parent.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/parents/${parent.id}`)}
                    >
                      View parent
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setUnlinkTarget({ linkId: parent.link_id, parentId: parent.id })
                      }
                    >
                      Unlink
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Groups</h2>
          {student.groups.length === 0 ? (
            <EmptyState
              title="No groups linked"
              description="Group enrollment will appear here once the student is assigned to a class."
              icon={<Link2 className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {student.groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3"
                >
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

      <StudentFormDrawer
        open={editOpen}
        mode="edit"
        onClose={() => setEditOpen(false)}
        onSubmit={submitStudent}
        busy={busy}
        error={actionError}
        initialValues={formFromDetail(student)}
      />

      <StudentLinkParentDrawer
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={handleLinkParent}
        busy={busy}
        error={actionError}
        parentOptions={availableParents}
        linkedParentIds={linkedParentIds}
      />

      <ConfirmDialog
        open={unlinkTarget !== null}
        title="Unlink parent"
        description="Remove this parent-child relationship? Historical information will remain in the database."
        onCancel={() => setUnlinkTarget(null)}
        onConfirm={handleUnlinkParent}
        busy={busy}
        confirmLabel="Unlink"
      />
    </div>
  )
}
