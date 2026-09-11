import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  CalendarCheck2,
  Clock,
  Edit2,
  Filter,
  GraduationCap,
  Layers3,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import {
  archiveGroup,
  createGroup,
  friendlyGroupError,
  listGroups,
  listTeachersForSelect,
  updateGroup,
} from '@/features/groups/api/groupsApi'
import { GroupFormDrawer } from '@/features/groups/components/GroupFormDrawer'
import type { GroupFormValues, GroupListItem, GroupStatus } from '@/features/groups/types'

const statusFilterTabs: Array<{ key: GroupStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Barchasi' },
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'PLANNED', label: 'Rejalashtirilgan' },
  { key: 'ARCHIVED', label: 'Arxivlangan' },
]

function groupStatusBadge(status: GroupStatus) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Faol</Badge>
    case 'PLANNED':
    case 'PAUSED':
      return <Badge variant="warning">Rejalashtirilgan</Badge>
    case 'ARCHIVED':
      return <Badge variant="neutral">Arxivlangan</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}

export function GroupsPage() {
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()

  const [groups, setGroups] = useState<GroupListItem[]>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; first_name: string; last_name: string; specialization: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<GroupStatus | 'ALL'>('ALL')

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupListItem | null>(null)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // Archive dialog
  const [archiveTarget, setArchiveTarget] = useState<GroupListItem | null>(null)
  const [archiveBusy, setArchiveBusy] = useState(false)

  const loadData = async () => {
    if (!organization?.id) return
    try {
      setLoading(true)
      setError(null)
      const [groupsData, teachersData] = await Promise.all([
        listGroups(organization.id, { search, status: selectedStatus }),
        listTeachersForSelect(organization.id),
      ])
      setGroups(groupsData)
      setTeachers(teachersData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Guruhlarni yuklashda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organization?.id) {
      void loadData()
    }
  }, [organization?.id, selectedStatus])

  // Debounced search
  useEffect(() => {
    if (!organization?.id) return
    const timer = setTimeout(() => {
      void loadData()
    }, 280)
    return () => clearTimeout(timer)
  }, [search])

  const handleOpenCreate = () => {
    setEditingGroup(null)
    setDrawerError(null)
    setDrawerOpen(true)
  }

  const handleOpenEdit = (group: GroupListItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingGroup(group)
    setDrawerError(null)
    setDrawerOpen(true)
  }

  const handleDrawerSubmit = async (values: GroupFormValues) => {
    if (!organization?.id) return
    try {
      setDrawerBusy(true)
      setDrawerError(null)
      if (editingGroup) {
        await updateGroup(organization.id, editingGroup.id, values, profile?.id)
      } else {
        await createGroup(organization.id, values, profile?.id)
      }
      setDrawerOpen(false)
      await loadData()
    } catch (err: unknown) {
      setDrawerError(friendlyGroupError(err as any))
    } finally {
      setDrawerBusy(false)
    }
  }

  const handleConfirmArchive = async () => {
    if (!organization?.id || !archiveTarget) return
    try {
      setArchiveBusy(true)
      await archiveGroup(organization.id, archiveTarget.id, profile?.id)
      setArchiveTarget(null)
      await loadData()
    } catch (err: unknown) {
      setError(friendlyGroupError(err as any))
    } finally {
      setArchiveBusy(false)
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = groups.length
    const active = groups.filter((g) => g.status === 'ACTIVE').length
    const totalStudents = groups.reduce((acc, g) => acc + g.student_count, 0)
    const totalCap = groups.reduce((acc, g) => acc + (g.capacity || 0), 0)
    const occupancy = totalCap > 0 ? Math.round((totalStudents / totalCap) * 100) : 0
    return { total, active, totalStudents, occupancy }
  }, [groups])

  if (!isSupabaseConfigured) {
    return (
      <StateScreen
        badge="Sozlash talab etiladi"
        title="Supabase ulanmagan"
        description="Ilovani ishlatish uchun .env faylida VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY kalitlarini sozlang."
      />
    )
  }

  if (orgLoading) {
    return <LoadingState message="Tashkilot maʼlumotlari yuklanmoqda..." />
  }

  if (orgError || !organization) {
    return (
      <StateScreen
        badge="Xatolik"
        title="Tashkilot topilmadi"
        description="Foydalanuvchi hech qanday faol oʼquv markaziga biriktirilmagan."
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Phase 2 - O'quv & Davomat"
        title="O'quv Guruhlari"
        description="O'quv markazidagi barcha guruhlar, jadvallar, o'qituvchilar va o'quvchilar sig'imi nazorati."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Yangi Guruh Yaratish</span>
          </Button>
        }
      />

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Jami Guruhlar"
          value={String(stats.total)}
          hint="Markazdagi umumiy guruhlar soni"
          icon={<Layers3 className="h-5 w-5" />}
        />
        <StatCard
          label="Faol Guruhlar"
          value={String(stats.active)}
          hint="Hozirda dars o'tilayotgan guruhlar"
          icon={<CalendarCheck2 className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="Jami O'quvchilar"
          value={String(stats.totalStudents)}
          hint="Guruhlarga biriktirilgan o'quvchilar"
          icon={<Users className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="O'rtacha To'liqlik"
          value={`${stats.occupancy}%`}
          hint="Xonalar va o'rinlar bandlik darajasi"
          icon={<GraduationCap className="h-5 w-5 text-purple-500" />}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
          <Input
            placeholder="Guruh nomi, fan yoki xona bo'yicha qidirish..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] p-1">
          {statusFilterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStatus(tab.key)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedStatus === tab.key
                  ? 'bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-sm'
                  : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingState message="Guruhlar ro'yxati yuklanmoqda..." />
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-400">
          {error}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Guruhlar topilmadi"
          description="Ushbu mezonlar bo'yicha birorta ham guruh topilmadi. Yangi guruh qo'shishingiz mumkin."
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Guruh yaratish</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const occupancyPercent =
              group.capacity > 0 ? Math.min(100, Math.round((group.student_count / group.capacity) * 100)) : 0

            return (
              <Card
                key={group.id}
                className="group relative flex flex-col justify-between overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm transition hover:shadow-md hover:border-blue-500/30"
              >
                {/* Neon Top Border highlight on hover */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-purple-500/0 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="space-y-4">
                  {/* Header: Subject & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-lg bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-500/20">
                        {group.subject}
                      </span>
                      <h3 className="mt-2 text-lg font-bold tracking-tight text-[rgb(var(--text))] group-hover:text-blue-600 transition">
                        <Link to={`/groups/${group.id}`}>{group.name}</Link>
                      </h3>
                    </div>
                    <div>{groupStatusBadge(group.status)}</div>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] p-2.5">
                    {group.teacher?.avatar_url ? (
                      <img
                        src={group.teacher.avatar_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                        {group.teacher ? `${group.teacher.first_name[0]}${group.teacher.last_name[0]}` : '—'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[rgb(var(--text))]">
                        {group.teacher
                          ? `${group.teacher.first_name} ${group.teacher.last_name}`
                          : "O'qituvchi biriktirilmagan"}
                      </p>
                      <p className="truncate text-[11px] text-[rgb(var(--muted))]">
                        {group.teacher?.specialization || "O'qituvchi"}
                      </p>
                    </div>
                  </div>

                  {/* Schedule & Room Tags */}
                  <div className="space-y-1.5 text-xs text-[rgb(var(--muted))]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {group.schedule?.days && group.schedule.days.length > 0
                          ? group.schedule.days.join(', ')
                          : 'Kunlar belgilanmagan'}
                      </span>
                    </div>
                    {group.schedule?.time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{group.schedule.time}</span>
                      </div>
                    )}
                    {group.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{group.room}</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[rgb(var(--muted))]">O'quvchilar sig'imi:</span>
                      <span className="font-bold text-[rgb(var(--text))]">
                        {group.student_count} / {group.capacity || '∞'} ({occupancyPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--surface-soft))] border border-[rgb(var(--border))]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          occupancyPercent >= 90
                            ? 'bg-rose-500'
                            : occupancyPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 flex items-center justify-between gap-2 border-t border-[rgb(var(--border))] pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/attendance?groupId=${group.id}`)}
                      className="gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <CalendarCheck2 className="h-3.5 w-3.5" />
                      <span>Davomat</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="text-xs"
                    >
                      Batafsil
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(group, e)}
                      className="rounded-lg p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition"
                      title="Tahrirlash"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setArchiveTarget(group)
                      }}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10 transition"
                      title="Arxivlash"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Drawer: Create / Edit Group */}
      <GroupFormDrawer
        open={drawerOpen}
        group={editingGroup}
        teachers={teachers}
        busy={drawerBusy}
        error={drawerError}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Guruhni arxivlash"
        description={`Haqiqatan ham "${archiveTarget?.name}" guruhini arxivlamoqchimisiz? Guruh arxivi faol ro'yxatdan yashiriladi.`}
        confirmLabel={archiveBusy ? 'Arxivlanmoqda...' : 'Ha, arxivlash'}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}
