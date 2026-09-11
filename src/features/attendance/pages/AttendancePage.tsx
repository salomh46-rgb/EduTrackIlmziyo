import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  BellRing,
  Calendar,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Layers3,
  Phone,
  Save,
  Search,
  Send,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/Select'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import {
  friendlyAttendanceError,
  getGroupAttendanceRoster,
  listGroupsForAttendance,
  recordAttendanceBulk,
} from '@/features/attendance/api/attendanceApi'
import type { AttendanceRosterStudent, AttendanceStatus } from '@/features/attendance/types'

function getTodayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getYesterdayIsoDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialGroupId = searchParams.get('groupId') ?? ''

  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()

  const [groups, setGroups] = useState<Array<{ id: string; name: string; subject: string; room: string | null }>>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate())

  const [roster, setRoster] = useState<AttendanceRosterStudent[]>([])
  const [existingLessonId, setExistingLessonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

  // Local filter
  const [searchFilter, setSearchFilter] = useState('')

  // 1. Load available groups
  useEffect(() => {
    if (!organization?.id) return
    let active = true

    async function loadGroupsList() {
      try {
        const groupsData = await listGroupsForAttendance(organization!.id)
        if (!active) return
        setGroups(groupsData)
        if (!selectedGroupId && groupsData.length > 0) {
          const defaultGroup = initialGroupId && groupsData.some((g) => g.id === initialGroupId)
            ? initialGroupId
            : groupsData[0].id
          setSelectedGroupId(defaultGroup)
        }
      } catch (err: unknown) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Guruhlar roʼyxatini yuklashda xatolik.')
      }
    }

    void loadGroupsList()
    return () => {
      active = false
    }
  }, [organization?.id])

  // Sync selectedGroupId with searchParams
  useEffect(() => {
    if (selectedGroupId) {
      setSearchParams({ groupId: selectedGroupId }, { replace: true })
    }
  }, [selectedGroupId, setSearchParams])

  // 2. Load roster when selectedGroupId or selectedDate changes
  const loadRoster = async () => {
    if (!organization?.id || !selectedGroupId) {
      setRoster([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      setSaveSuccessMessage(null)
      const data = await getGroupAttendanceRoster(organization.id, selectedGroupId, selectedDate)
      setRoster(data.students)
      setExistingLessonId(data.existingLessonId)
    } catch (err: unknown) {
      setError(friendlyAttendanceError(err as any))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRoster()
  }, [organization?.id, selectedGroupId, selectedDate])

  // Change single student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s)),
    )
  }

  // Change single student note
  const handleNoteChange = (studentId: string, note: string) => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, note } : s)),
    )
  }

  // Quick action: Fill all present
  const handleFillAllPresent = () => {
    setRoster((prev) => prev.map((s) => ({ ...s, status: 'PRESENT' })))
  }

  // Save Attendance & Enqueue Telegram notifications
  const handleSaveAttendance = async () => {
    if (!organization?.id || !selectedGroupId || roster.length === 0) return
    try {
      setSaving(true)
      setError(null)
      setSaveSuccessMessage(null)

      const records = roster.map((s) => ({
        studentId: s.student_id,
        status: s.status,
        note: s.note,
      }))

      const result = await recordAttendanceBulk(
        organization.id,
        {
          groupId: selectedGroupId,
          lessonId: existingLessonId ?? undefined,
          lessonDate: selectedDate,
          records,
        },
        profile?.id,
      )

      setSaveSuccessMessage(
        `Davomat muvaffaqiyatli saqlandi! (${result.savedCount} ta oʼquvchi). ${
          result.absentNotificationsQueued > 0
            ? `${result.absentNotificationsQueued} ta oʼquvchi uchun Telegram xabarnomasi navbatga qo'yildi.`
            : ''
        }`,
      )
      // Reload roster to fetch fresh database IDs
      await loadRoster()
    } catch (err: unknown) {
      setError(friendlyAttendanceError(err as any))
    } finally {
      setSaving(false)
    }
  }

  // Calculated Stats
  const stats = useMemo(() => {
    const total = roster.length
    const present = roster.filter((s) => s.status === 'PRESENT').length
    const absent = roster.filter((s) => s.status === 'ABSENT').length
    const late = roster.filter((s) => s.status === 'LATE').length
    const excused = roster.filter((s) => s.status === 'EXCUSED').length
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
    return { total, present, absent, late, excused, rate }
  }, [roster])

  const filteredRoster = useMemo(() => {
    if (!searchFilter.trim()) return roster
    const term = searchFilter.toLowerCase()
    return roster.filter(
      (s) =>
        s.student_name.toLowerCase().includes(term) ||
        (s.phone && s.phone.includes(term)),
    )
  }, [roster, searchFilter])

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  if (!isSupabaseConfigured) {
    return (
      <StateScreen
        badge="Sozlash talab etiladi"
        title="Supabase ulanmagan"
        description="Ilovani ishlatish uchun konfiguratsiyani tekshiring."
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
        description="Foydalanuvchi faol oʼquv markaziga biriktirilmagan."
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Phase 2 - O'quv & Davomat Dvigateli"
        title="Kunlik Davomat"
        description="Guruhlar bo'yicha interaktiv 1-klik davomat jurnali va darsga kelmaganlar uchun Telegram ogohlantirishlari."
        actions={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleFillAllPresent}
              disabled={loading || saving || roster.length === 0}
              className="gap-2 text-emerald-600 hover:text-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Barchasini keldi qilish</span>
            </Button>
            <Button
              type="button"
              onClick={handleSaveAttendance}
              disabled={loading || saving || roster.length === 0}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saqlanmoqda...' : 'Saqlash va Xabarnomalarni Yuborish'}</span>
            </Button>
          </div>
        }
      />

      {/* Control Selector Bar: Date & Group */}
      <Card className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Group Selector */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))] flex items-center gap-1.5">
              <Layers3 className="h-3.5 w-3.5 text-blue-500" />
              <span>O'quv Guruhi</span>
            </label>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={loading || saving}
            >
              {groups.length === 0 ? (
                <option value="">Faol guruhlar mavjud emas</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.subject} {g.room ? `(${g.room})` : ''}
                  </option>
                ))
              )}
            </Select>
          </div>

          {/* Date Selector with Quick Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                <span>Dars Sanasi</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayIsoDate())}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition ${
                    selectedDate === getTodayIsoDate()
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-500/10'
                  }`}
                >
                  Bugun
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getYesterdayIsoDate())}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition ${
                    selectedDate === getYesterdayIsoDate()
                      ? 'bg-blue-600 text-white'
                      : 'text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))]'
                  }`}
                >
                  Kecha
                </button>
              </div>
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loading || saving}
              className="h-11"
            />
          </div>
        </div>
      </Card>

      {/* Attendance Stats Bar & Rate Gauge */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Present Card */}
        <Card className="p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Keldi (Present)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {stats.present} <span className="text-xs font-normal text-[rgb(var(--muted))]">o'quvchi</span>
          </p>
        </Card>

        {/* Absent Card */}
        <Card className="p-4 border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Kelmadi (Absent)
            </span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-rose-700 dark:text-rose-400">
              {stats.absent} <span className="text-xs font-normal text-[rgb(var(--muted))]">o'quvchi</span>
            </p>
            {stats.absent > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                <Send className="h-3 w-3" />
                Telegram alert
              </span>
            )}
          </div>
        </Card>

        {/* Late Card */}
        <Card className="p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Kechikdi (Late)
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.late} <span className="text-xs font-normal text-[rgb(var(--muted))]">o'quvchi</span>
          </p>
        </Card>

        {/* Excused Card */}
        <Card className="p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Sababli (Excused)
            </span>
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
            {stats.excused} <span className="text-xs font-normal text-[rgb(var(--muted))]">o'quvchi</span>
          </p>
        </Card>

        {/* Attendance Rate Circular Gauge */}
        <Card className="relative overflow-hidden p-4 border border-[rgb(var(--border))] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
              Davomat Ko'rsatkichi
            </p>
            <p className="mt-1 text-2xl font-black text-[rgb(var(--text))]">{stats.rate}%</p>
            <p className="text-[11px] text-[rgb(var(--muted))]">Jami {stats.total} o'quvchidan</p>
          </div>
          {/* Circular SVG Gauge */}
          <div className="relative h-14 w-14 shrink-0">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-[rgb(var(--surface-soft))]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`transition-all duration-700 ${
                  stats.rate >= 80
                    ? 'text-emerald-500'
                    : stats.rate >= 60
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
                strokeDasharray={`${stats.rate}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black">{stats.rate}%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Messages */}
      {saveSuccessMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-600">
          <Check className="h-4 w-4 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Telegram Automation Alert Hint Banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 shrink-0">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-[rgb(var(--text))]">
              Avtomatik Telegram Ogohlantirish Tizimi
            </p>
            <p className="text-[rgb(var(--muted))]">
              "Kelmadi" (ABSENT) holatidagi o'quvchilar saqlanganda, ularning ota-onalariga Telegram orqali sabab so'rov xabari navbatga qo'yiladi.
            </p>
          </div>
        </div>
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted))]" />
          <Input
            placeholder="O'quvchini qidirish..."
            className="pl-9 h-9 text-xs"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Student Roll Table */}
      {loading ? (
        <LoadingState message="O'quvchilar ro'yxati yuklanmoqda..." />
      ) : roster.length === 0 ? (
        <EmptyState
          title="Ushbu guruhda o'quvchilar topilmadi"
          description="Guruh tafsilotlari sahifasiga o'tib, guruhga o'quvchilarni biriktirishingiz mumkin."
        />
      ) : (
        <Card className="overflow-hidden border border-[rgb(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))] uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">O'quvchi</th>
                  <th className="px-5 py-3.5">Telefon / Ota-ona</th>
                  <th className="px-5 py-3.5 text-center">Davomat Holati (1-Klik)</th>
                  <th className="px-5 py-3.5">Izoh (Sabab)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {filteredRoster.map((student, idx) => {
                  const isAbsent = student.status === 'ABSENT'

                  return (
                    <tr
                      key={student.student_id}
                      className={`transition ${
                        isAbsent
                          ? 'bg-rose-500/5 hover:bg-rose-500/10'
                          : 'hover:bg-[rgb(var(--surface-soft))]/60'
                      }`}
                    >
                      <td className="px-5 py-3.5 text-[rgb(var(--muted))]">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                              {student.first_name[0]}
                              {student.last_name[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-[rgb(var(--text))]">
                              {student.student_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {student.telegram_verified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.2 text-[10px] font-semibold text-blue-600">
                                  <Send className="h-2.5 w-2.5" />
                                  Telegram ulangan
                                </span>
                              ) : (
                                <span className="text-[10px] text-[rgb(var(--muted))]">
                                  Telegram ulanmagan
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <p className="text-[rgb(var(--text))] font-medium">
                            {student.phone || '—'}
                          </p>
                          {student.parent_name && (
                            <p className="text-[11px] text-[rgb(var(--muted))]">
                              Vasiy: {student.parent_name} {student.parent_phone ? `(${student.parent_phone})` : ''}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 🟢 PRESENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.student_id, 'PRESENT')}
                            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition text-xs ${
                              student.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                                : 'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--muted))] hover:text-emerald-600 hover:border-emerald-500/30'
                            }`}
                          >
                            <span>🟢</span>
                            <span>Keldi</span>
                          </button>

                          {/* 🔴 ABSENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.student_id, 'ABSENT')}
                            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition text-xs ${
                              student.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                                : 'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--muted))] hover:text-rose-600 hover:border-rose-500/30'
                            }`}
                          >
                            <span>🔴</span>
                            <span>Kelmadi</span>
                            {student.status === 'ABSENT' && (
                              <Send className="h-3 w-3 ml-0.5 animate-pulse" />
                            )}
                          </button>

                          {/* 🟡 LATE */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.student_id, 'LATE')}
                            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition text-xs ${
                              student.status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                                : 'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--muted))] hover:text-amber-600 hover:border-amber-500/30'
                            }`}
                          >
                            <span>🟡</span>
                            <span>Kechikdi</span>
                          </button>

                          {/* 🔵 EXCUSED */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.student_id, 'EXCUSED')}
                            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 font-bold transition text-xs ${
                              student.status === 'EXCUSED'
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                                : 'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--muted))] hover:text-blue-600 hover:border-blue-500/30'
                            }`}
                          >
                            <span>🔵</span>
                            <span>Sababli</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Input
                          placeholder="Qisqa izoh..."
                          value={student.note}
                          onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                          className="h-9 text-xs"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Floating or Bottom Save Bar */}
      {roster.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>
              O'zgarishlarni kiritgach, saqlash tugmasini bosishni unutmang.
            </span>
          </div>
          <Button
            type="button"
            onClick={handleSaveAttendance}
            disabled={loading || saving}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saqlanmoqda...' : 'Saqlash va Xabarnomalarni Yuborish'}</span>
          </Button>
        </div>
      )}
    </div>
  )
}
