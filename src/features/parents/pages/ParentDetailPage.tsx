import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Users } from 'lucide-react'
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
import { archiveParent, getParentDetail, linkStudentToParent, listAvailableStudents, unlinkStudentFromParent, updateParent } from '@/features/parents/api/parentsApi'
import type { ParentDetail, ParentFormValues } from '@/features/parents/types'
import { ParentFormDrawer } from '@/features/parents/components/ParentFormDrawer'
import { ParentLinkStudentDrawer } from '@/features/parents/components/ParentLinkStudentDrawer'
import type { RelationshipType } from '@/features/students/types'

function parentTitle(parent: ParentDetail | null) {
  return parent ? `${parent.first_name} ${parent.last_name}`.trim() : 'Parent'
}

function formFromParent(parent: ParentDetail): ParentFormValues {
  return {
    first_name: parent.first_name,
    last_name: parent.last_name,
    phone: parent.phone ?? '',
    email: parent.email ?? '',
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value))
}

export function ParentDetailPage() {
  const { parentId } = useParams()
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading } = useWorkspaceOrganization()
  const [parent, setParent] = useState<ParentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<{ linkId: string; studentId: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string; phone: string | null }>>([])

  const loadParent = async () => {
    if (!organization?.id || !parentId) {
      return
    }

    const detail = await getParentDetail(organization.id, parentId)
    setParent(detail)
  }

  useEffect(() => {
    let active = true

    async function load() {
      if (!organization?.id || !parentId || !isSupabaseConfigured) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const detail = await getParentDetail(organization.id, parentId)
        if (!active) {
          return
        }
        setParent(detail)
        setStudents(await listAvailableStudents(organization.id))
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load parent.')
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
  }, [isSupabaseConfigured, organization?.id, parentId])

  const linkedStudentIds = useMemo(() => parent?.children.map((child) => child.id) ?? [], [parent])

  const submitParent = async (values: ParentFormValues) => {
    if (!organization?.id || !profile?.id || !parent) {
      return
    }

    try {
      setBusy(true)
      await updateParent(organization.id, profile.id, parent.id, values)
      await loadParent()
      setEditOpen(false)
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Failed to update parent.')
    } finally {
      setBusy(false)
    }
  }

  const handleArchive = async () => {
    if (!organization?.id || !profile?.id || !parent) {
      return
    }

    try {
      setBusy(true)
      await archiveParent(organization.id, profile.id, parent.id)
      navigate('/parents', { replace: true })
    } catch (archiveError) {
      setActionError(archiveError instanceof Error ? archiveError.message : 'Failed to archive parent.')
    } finally {
      setBusy(false)
    }
  }

  const handleLinkStudent = async (values: { studentId: string; relationshipType: RelationshipType; isPrimary: boolean }) => {
    if (!organization?.id || !profile?.id || !parent) {
      return
    }

    try {
      setBusy(true)
      await linkStudentToParent(organization.id, profile.id, {
        parentId: parent.id,
        studentId: values.studentId,
        relationshipType: values.relationshipType,
        isPrimary: values.isPrimary,
      })
      await loadParent()
      setLinkOpen(false)
    } catch (linkError) {
      setActionError(linkError instanceof Error ? linkError.message : 'Failed to link student.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlinkStudent = async () => {
    if (!organization?.id || !profile?.id || !parent || !unlinkTarget) {
      return
    }

    try {
      setBusy(true)
      await unlinkStudentFromParent(organization.id, profile.id, unlinkTarget.linkId, parent.id, unlinkTarget.studentId)
      await loadParent()
      setUnlinkTarget(null)
    } catch (unlinkError) {
      setActionError(unlinkError instanceof Error ? unlinkError.message : 'Failed to unlink student.')
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <StateScreen title="Supabase is not configured" description="Set Supabase env vars to use the parent detail page." />
  }

  if (orgLoading || loading) {
    return <LoadingState title="Loading parent" description="Fetching parent profile and children." />
  }

  if (error || !parent) {
    return (
      <StateScreen
        title="Parent not found"
        description={error ?? 'The parent record is missing or you do not have access to it.'}
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate('/parents')}>
            <ArrowLeft className="h-4 w-4" />
            Back to parents
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Parent detail"
        title={parentTitle(parent)}
        description="Contact profile, notification status, and linked children."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/parents')}>
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

      {actionError ? <Card className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">{actionError}</Card> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-[rgb(var(--muted))]">Full name</p><p className="font-semibold">{parent.first_name} {parent.last_name}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Phone</p><p className="font-semibold">{parent.phone ?? '—'}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Email</p><p className="font-semibold">{parent.email ?? '—'}</p></div>
            <div><p className="text-[rgb(var(--muted))]">Telegram</p><Badge variant={parent.telegram_verified ? 'success' : 'warning'} className="mt-1">{parent.telegram_verified ? 'Linked' : 'Pending'}</Badge></div>
            <div><p className="text-[rgb(var(--muted))]">Notifications</p><Badge variant={parent.notification_enabled ? 'success' : 'warning'} className="mt-1">{parent.notification_enabled ? 'Enabled' : 'Disabled'}</Badge></div>
            <div><p className="text-[rgb(var(--muted))]">Created</p><p className="font-semibold">{formatDate(parent.created_at)}</p></div>
          </div>
        </Card>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Children</h2>
            <Button type="button" variant="secondary" onClick={() => setLinkOpen(true)}>
              <Plus className="h-4 w-4" />
              Link student
            </Button>
          </div>
          {parent.children.length === 0 ? (
            <EmptyState title="No children linked" description="Add a child to enable relationship-aware notifications." icon={<Users className="h-5 w-5" />} />
          ) : (
            <div className="space-y-3">
              {parent.children.map((child) => (
                <div key={child.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
                  <div>
                    <p className="font-semibold">{child.first_name} {child.last_name}</p>
                    <p className="text-sm text-[rgb(var(--muted))]">
                      {child.relationship_type}{child.is_primary ? ' · Primary' : ''}{child.group_name ? ` · ${child.group_name}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate(`/students/${child.id}`)}>
                      View student
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setUnlinkTarget({ linkId: child.link_id, studentId: child.id })}
                    >
                      Unlink
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ParentFormDrawer
        open={editOpen}
        mode="edit"
        onClose={() => setEditOpen(false)}
        onSubmit={submitParent}
        busy={busy}
        error={actionError}
        initialValues={formFromParent(parent)}
      />

      <ParentLinkStudentDrawer
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={handleLinkStudent}
        busy={busy}
        error={actionError}
        studentOptions={students}
        linkedStudentIds={linkedStudentIds}
      />

      <ConfirmDialog
        open={unlinkTarget !== null}
        title="Unlink student"
        description="Remove this parent-child relationship while keeping historical records."
        onCancel={() => setUnlinkTarget(null)}
        onConfirm={handleUnlinkStudent}
        busy={busy}
        confirmLabel="Unlink"
      />
    </div>
  )
}
