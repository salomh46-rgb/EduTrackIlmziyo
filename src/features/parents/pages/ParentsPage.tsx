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
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import { ParentFormDrawer } from '@/features/parents/components/ParentFormDrawer'
import { archiveParent, createParent, formatParentError, listParents, updateParent } from '@/features/parents/api/parentsApi'
import type { ParentFormValues, ParentListItem } from '@/features/parents/types'

const pageSize = 10

function parentTitle(parent: ParentListItem) {
  return `${parent.first_name} ${parent.last_name}`.trim()
}

function formFromParent(parent: ParentListItem): ParentFormValues {
  return {
    first_name: parent.first_name,
    last_name: parent.last_name,
    phone: parent.phone ?? '',
    email: parent.email ?? '',
  }
}

export function ParentsPage() {
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()
  const [rows, setRows] = useState<ParentListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | null>(null)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [selectedParent, setSelectedParent] = useState<ParentListItem | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ParentListItem | null>(null)

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
        const result = await listParents(organization.id, { page, pageSize, search })
        if (!active) {
          return
        }
        setRows(result.rows)
        setTotalCount(result.totalCount)
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load parents.')
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
  }, [isSupabaseConfigured, organization?.id, page, search])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const activeParent = useMemo(() => selectedParent, [selectedParent])

  const refresh = async () => {
    if (!organization?.id) {
      return
    }

    const result = await listParents(organization.id, { page, pageSize, search })
    setRows(result.rows)
    setTotalCount(result.totalCount)
  }

  const submitParent = async (values: ParentFormValues) => {
    if (!organization?.id || !profile?.id) {
      return
    }

    try {
      setDrawerBusy(true)
      if (drawerMode === 'edit' && activeParent) {
        await updateParent(organization.id, profile.id, activeParent.id, values)
      } else {
        await createParent(organization.id, profile.id, values)
      }
      await refresh()
      setDrawerMode(null)
      setSelectedParent(null)
    } catch (submitError) {
      setDrawerError(
        submitError && typeof submitError === 'object' && 'code' in submitError
          ? formatParentError(submitError as Parameters<typeof formatParentError>[0])
          : submitError instanceof Error
            ? submitError.message
            : 'Failed to save parent.',
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
      await archiveParent(organization.id, profile.id, archiveTarget.id)
      await refresh()
      setArchiveTarget(null)
    } catch (archiveError) {
      setDrawerError(archiveError instanceof Error ? archiveError.message : 'Failed to archive parent.')
    } finally {
      setDrawerBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return <LoadingState title="Supabase configuration required" description="Configure Supabase to use the Parents CRM." />
  }

  if (orgLoading) {
    return <LoadingState title="Loading parents" description="Loading organization context and parent records." />
  }

  if (orgError || !organization) {
    return (
      <EmptyState
        title="Workspace not ready"
        description={orgError ?? 'We could not resolve an active organization for the current user.'}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Parents"
        title="Manage parents and children"
        description="Maintain parent contacts, notification status, and child relationships."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading}>
              Previous
            </Button>
            <Button type="button" onClick={() => {
              setDrawerMode('create')
              setSelectedParent(null)
              setDrawerError(null)
            }}>
              <Plus className="h-4 w-4" />
              Add parent
            </Button>
          </>
        }
      />

      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[rgb(var(--muted))]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(0)
              }}
              className="!h-auto !border-0 !bg-transparent !px-0 !py-0 !shadow-none focus:!ring-0"
              placeholder="Search parents by name or phone"
            />
          </label>
          <Button type="button" variant="secondary" onClick={() => {
            setSearch('')
            setPage(0)
          }}>
            <Filter className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-[rgb(var(--muted))]">
          <span>
            {totalCount} parent{totalCount === 1 ? '' : 's'} found
          </span>
          <span>
            Page {page + 1} of {totalPages}
          </span>
        </div>
      </Card>

      {error ? <Card className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</Card> : null}

      {loading ? (
        <LoadingState title="Loading parents" description="Fetching parent records from Supabase." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No parents yet"
          description="Add the first parent record to begin linking students and enabling notifications."
          icon={<Users className="h-5 w-5" />}
          action={
            <Button type="button" onClick={() => setDrawerMode('create')}>
              <Plus className="h-4 w-4" />
              Add parent
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((parent) => (
            <Card key={parent.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link to={`/parents/${parent.id}`} className="text-lg font-bold hover:text-[rgb(var(--primary))]">
                    {parentTitle(parent)}
                  </Link>
                  <p className="text-sm text-[rgb(var(--muted))]">
                    {parent.phone ?? 'No phone'} · {parent.email ?? 'No email'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={parent.telegram_verified ? 'success' : 'warning'}>
                    {parent.telegram_verified ? 'Telegram linked' : 'Telegram pending'}
                  </Badge>
                  <Badge variant={parent.notification_enabled ? 'success' : 'warning'}>
                    {parent.notification_enabled ? 'Notifications on' : 'Notifications off'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-[rgb(var(--muted))]">
                  Children: <span className="font-semibold text-[rgb(var(--text))]">{parent.child_count}</span>
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => navigate(`/parents/${parent.id}`)}>
                    View
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => {
                    setSelectedParent(parent)
                    setDrawerMode('edit')
                    setDrawerError(null)
                  }}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setArchiveTarget(parent)}>
                    Archive
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
            Previous
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1}>
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <ParentFormDrawer
        open={drawerMode !== null}
        mode={drawerMode ?? 'create'}
        onClose={() => {
          setDrawerMode(null)
          setSelectedParent(null)
          setDrawerError(null)
        }}
        onSubmit={submitParent}
        busy={drawerBusy}
        error={drawerError}
        initialValues={selectedParent ? formFromParent(selectedParent) : undefined}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive parent"
        description={`Archive ${archiveTarget ? parentTitle(archiveTarget) : 'this parent'}? The record remains in the database for history and relationships.`}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        busy={drawerBusy}
        confirmLabel="Archive"
      />
    </div>
  )
}
