import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CalendarCheck2,
  Clock,
  Edit2,
  GraduationCap,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Drawer } from '@/components/Drawer'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import {
  addStudentToGroup,
  friendlyGroupError,
  getGroupDetail,
  listAvailableStudentsForGroup,
  listTeachersForSelect,
  removeStudentFromGroup,
  updateGroup,
} from '@/features/groups/api/groupsApi'
import { GroupFormDrawer } from '@/features/groups/components/GroupFormDrawer'
import type { GroupDetail, GroupFormValues, GroupStudent } from '@/features/groups/types'

function formatDate(val: string | null) {
  if (!val) return '—'
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(val))
}

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [teachers, setTeachers] = useState<Array<{ id: string; first_name: string; last_name: string; specialization: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Add Student Drawer
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; first_name: string; last_name: string; phone: string | null }>>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Remove Student confirmation
  const [removeTarget, setRemoveTarget] = useState<GroupStudent | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  // Local student roster search
  const [rosterSearch, setRosterSearch] = useState('')

  const loadGroup = async () => {
    if (!organization?.id || !groupId) return
    try {
      setLoading(true)
      setError(null)
      const [groupData, teachersData] = await Promise.all([
        getGroupDetail(organization.id, groupId),
        listTeachersForSelect(organization.id),
      ])
      if (!groupData) {
        setError('Guruh topilmadi.')
      } else {
        setGroup(groupData)
      }
      setTeachers(teachersData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Guruh maʼlumotlarini yuklashda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organization?.id && groupId) {
      void loadGroup()
    }
  }, [organization?.id, groupId])

  const handleOpenAddStudent = async () => {
    if (!organization?.id || !groupId) return
    try {
      setAddDrawerOpen(true)
      setAddError(null)
      const avail = await listAvailableStudentsForGroup(organization.id, groupId)
      setAvailableStudents(avail)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Oʼquvchilar roʼyxatini yuklashda xatolik.')
    }
  }

  const handleAddStudent = async (studentId: string) => {
    if (!organization?.id || !groupId) return
    try {
      setAddBusy(true)
      await addStudentToGroup(organization.id, groupId, studentId, profile?.id)
      await loadGroup()
      // Remove added student from available list
      setAvailableStudents((prev) => prev.filter((s) => s.id !== studentId))
    } catch (err: unknown) {
      setAddError(friendlyGroupError(err as any))
    } finally {
      setAddBusy(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!organization?.id || !groupId || !removeTarget) return
    try {
      setRemoveBusy(true)
      await removeStudentFromGroup(organization.id, groupId, removeTarget.student_id, profile?.id)
      setRemoveTarget(null)
      await loadGroup()
    } catch (err: unknown) {
      setError(friendlyGroupError(err as any))
    } finally {
      setRemoveBusy(false)
    }
  }

  const handleEditSubmit = async (values: GroupFormValues) => {
    if (!organization?.id || !groupId) return
    try {
      setEditBusy(true)
      setEditError(null)
      await updateGroup(organization.id, groupId, values, profile?.id)
      setEditDrawerOpen(false)
      await loadGroup()
    } catch (err: unknown) {
      setEditError(friendlyGroupError(err as any))
    } finally {
      setEditBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <StateScreen
        badge="Sozlash talab etiladi"
        title="Supabase ulanmagan"
        description="Ilovani ishlatish uchun konfiguratsiyani tekshiring."
      />
    )
  }

  if (orgLoading || loading) {
    return <LoadingState message="Guruh maʼlumotlari yuklanmoqda..." />
  }

  if (error || !group) {
    return (
      <StateScreen
        badge="Xatolik"
        title={error || 'Guruh topilmadi'}
        description="Guruh o'chirilgan yoki sizda unga kirish huquqi mavjud emas."
        action={
          <Button variant="secondary" onClick={() => navigate('/groups')}>
            Guruhlar ro'yxatiga qaytish
          </Button>
        }
      />
    )
  }

  const filteredRoster = group.students.filter((s) => {
    if (!rosterSearch.trim()) return true
    const term = rosterSearch.toLowerCase()
    return (
      s.first_name.toLowerCase().includes(term) ||
      s.last_name.toLowerCase().includes(term) ||
      (s.phone && s.phone.includes(term))
    )
  })

  const filteredAvailable = availableStudents.filter((s) => {
    if (!studentSearch.trim()) return true
    const term = studentSearch.toLowerCase()
    return (
      s.first_name.toLowerCase().includes(term) ||
      s.last_name.toLowerCase().includes(term) ||
      (s.phone && s.phone.includes(term))
    )
  })

  const occupancyPercent =
    group.capacity > 0 ? Math.min(100, Math.round((group.student_count / group.capacity) * 100)) : 0

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Guruhlar ro'yxatiga qaytish</span>
        </Link>
        <PageHeader
          badge={group.subject}
          title={group.name}
          description={`Xona: ${group.room || 'Belgilanmagan'} • Sig'im: ${group.student_count} / ${group.capacity}`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(`/attendance?groupId=${group.id}`)}
                className="gap-2 text-blue-600 hover:text-blue-700"
              >
                <CalendarCheck2 className="h-4 w-4" />
                <span>Davomat Olish</span>
              </Button>
              <Button onClick={() => setEditDrawerOpen(true)} className="gap-2">
                <Edit2 className="h-4 w-4" />
                <span>Tahrirlash</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Group Overview Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Teacher Card */}
        <Card className="p-5 space-y-3 border border-[rgb(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
              O'qituvchi
            </span>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </div>
          {group.teacher ? (
            <div className="flex items-center gap-3">
              {group.teacher.avatar_url ? (
                <img
                  src={group.teacher.avatar_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover border border-blue-500/20"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600">
                  {group.teacher.first_name[0]}
                  {group.teacher.last_name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm text-[rgb(var(--text))]">
                  {group.teacher.first_name} {group.teacher.last_name}
                </p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  {group.teacher.specialization || "O'qituvchi"}
                </p>
                {group.teacher.phone && (
                  <p className="text-[11px] text-[rgb(var(--muted))] flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    <span>{group.teacher.phone}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[rgb(var(--muted))] italic">O'qituvchi tayinlanmagan.</p>
          )}
        </Card>

        {/* Schedule & Location */}
        <Card className="p-5 space-y-3 border border-[rgb(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
              Dars Jadvali
            </span>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[rgb(var(--text))]">
              <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="font-semibold">
                {group.schedule?.days && group.schedule.days.length > 0
                  ? group.schedule.days.join(', ')
                  : 'Kunlar belgilanmagan'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[rgb(var(--muted))]">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{group.schedule?.time || 'Vaqt belgilanmagan'}</span>
            </div>
            <div className="flex items-center gap-2 text-[rgb(var(--muted))]">
              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>{group.room || 'Xona belgilanmagan'}</span>
            </div>
          </div>
        </Card>

        {/* Capacity & Occupancy */}
        <Card className="p-5 space-y-3 border border-[rgb(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
              Guruh Sig'imi
            </span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-[rgb(var(--text))]">
                {group.student_count}
                <span className="text-sm font-normal text-[rgb(var(--muted))]">
                  {' '}
                  / {group.capacity} o'quvchi
                </span>
              </span>
              <span className="text-xs font-bold text-blue-600">{occupancyPercent}%</span>
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
            <p className="text-[11px] text-[rgb(var(--muted))]">
              {group.capacity - group.student_count > 0
                ? `Yana ${group.capacity - group.student_count} ta bo'sh o'rin mavjud`
                : 'Guruh toʼliq band qilingan'}
            </p>
          </div>
        </Card>
      </div>

      {/* Student Roster Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[rgb(var(--text))]">
              O'quvchilar Ro'yxati ({group.students.length})
            </h3>
            <p className="text-xs text-[rgb(var(--muted))]">
              Guruhda faol ta'lim olayotgan o'quvchilar ro'yxati va a'zolik holati.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted))]" />
              <Input
                placeholder="Ro'yxatdan qidirish..."
                className="pl-9 h-9 text-xs"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleOpenAddStudent} size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>O'quvchi qo'shish</span>
            </Button>
          </div>
        </div>

        {filteredRoster.length === 0 ? (
          <EmptyState
            title="Guruhda hozircha o'quvchilar yo'q"
            description="Ushbu guruhga o'quv markazidagi o'quvchilarni biriktirishingiz mumkin."
            action={
              <Button onClick={handleOpenAddStudent} size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>O'quvchi biriktirish</span>
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden border border-[rgb(var(--border))]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))] uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">#</th>
                    <th className="px-5 py-3.5">O'quvchi</th>
                    <th className="px-5 py-3.5">Telefon</th>
                    <th className="px-5 py-3.5">Qo'shilgan sana</th>
                    <th className="px-5 py-3.5">Holati</th>
                    <th className="px-5 py-3.5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {filteredRoster.map((student, idx) => (
                    <tr
                      key={student.student_id}
                      className="hover:bg-[rgb(var(--surface-soft))]/60 transition"
                    >
                      <td className="px-5 py-3.5 text-[rgb(var(--muted))]">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                              {student.first_name[0]}
                              {student.last_name[0]}
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/students/${student.student_id}`}
                              className="font-bold text-[rgb(var(--text))] hover:text-blue-600 transition"
                            >
                              {student.first_name} {student.last_name}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[rgb(var(--muted))]">
                        {student.phone || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[rgb(var(--muted))]">
                        {formatDate(student.joined_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="success">Faol</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(student)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition"
                          title="Guruhdan chiqarish"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          <span>Chiqarish</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Group Drawer */}
      <GroupFormDrawer
        open={editDrawerOpen}
        group={group}
        teachers={teachers}
        busy={editBusy}
        error={editError}
        onClose={() => setEditDrawerOpen(false)}
        onSubmit={handleEditSubmit}
      />

      {/* Add Student to Group Drawer */}
      <Drawer
        open={addDrawerOpen}
        title="Guruhga O'quvchi Qo'shish"
        description="O'quv markazidagi mavjud o'quvchilardan tanlang va guruhga biriktiring."
        onClose={() => setAddDrawerOpen(false)}
      >
        <div className="space-y-4">
          {addError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400">
              {addError}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
            <Input
              placeholder="Ism, familiya yoki telefon bo'yicha qidirish..."
              className="pl-9"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          <div className="divide-y divide-[rgb(var(--border))] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] max-h-96 overflow-y-auto">
            {filteredAvailable.length === 0 ? (
              <div className="p-6 text-center text-xs text-[rgb(var(--muted))]">
                Qo'shish mumkin bo'lgan o'quvchilar topilmadi.
              </div>
            ) : (
              filteredAvailable.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-[rgb(var(--surface))] transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[rgb(var(--text))]">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-[11px] text-[rgb(var(--muted))]">{s.phone || 'Telefon yoʼq'}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={addBusy}
                    onClick={() => handleAddStudent(s.id)}
                    className="gap-1 text-xs"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Qo'shish</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Drawer>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="O'quvchini guruhdan chiqarish"
        description={`Haqiqatan ham "${removeTarget?.first_name} ${removeTarget?.last_name}"ni ushbu guruhdan chiqarmoqchimisiz?`}
        confirmLabel={removeBusy ? 'Chiqarilmoqda...' : 'Ha, chiqarish'}
        onConfirm={handleRemoveStudent}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
