import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  GraduationCap,
  Layers3,
  Medal,
  Plus,
  Save,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Drawer } from '@/components/Drawer'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { PageHeader } from '@/components/PageHeader'
import { Select } from '@/components/Select'
import { StatCard } from '@/components/StatCard'
import { StateScreen } from '@/components/StateScreen'
import { useAuth } from '@/lib/auth/auth'
import { useWorkspaceOrganization } from '@/features/shared/api/organization'
import {
  calculateGrade,
  createExam,
  friendlyExamError,
  getExamDetail,
  getExamLeaderboard,
  listExams,
  listGroupsForExams,
  recordExamResultsBulk,
} from '@/features/exams/api/examsApi'
import { listTeachersForSelect } from '@/features/groups/api/groupsApi'
import type {
  ExamDetail,
  ExamFormValues,
  ExamListItem,
  ExamResultInput,
  StudentExamLeaderboard,
} from '@/features/exams/types'

function gradeBadgeVariant(grade: string): 'success' | 'primary' | 'warning' | 'danger' | 'neutral' {
  switch (grade) {
    case 'A':
      return 'success'
    case 'B':
      return 'primary'
    case 'C':
      return 'warning'
    case 'D':
    case 'F':
      return 'danger'
    default:
      return 'neutral'
  }
}

function formatDate(val: string) {
  if (!val) return '—'
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(val))
}

export function ExamsPage() {
  const { profile, isSupabaseConfigured } = useAuth()
  const { organization, loading: orgLoading, error: orgError } = useWorkspaceOrganization()

  const [exams, setExams] = useState<ExamListItem[]>([])
  const [groups, setGroups] = useState<Array<{ id: string; name: string; subject: string; teacher_id: string | null }>>([])
  const [teachers, setTeachers] = useState<Array<{ id: string; first_name: string; last_name: string; specialization: string | null }>>([])

  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Create Exam Drawer State
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [examForm, setExamForm] = useState<ExamFormValues>({
    title: '',
    subject: '',
    group_id: '',
    teacher_id: '',
    exam_date: new Date().toISOString().split('T')[0],
    maximum_score: 100,
  })

  // 2. Grade Entry Drawer State
  const [gradingDrawerOpen, setGradingDrawerOpen] = useState(false)
  const [activeExamDetail, setActiveExamDetail] = useState<ExamDetail | null>(null)
  const [gradingScores, setGradingScores] = useState<Record<string, { score: number | string; comment: string }>>({})
  const [gradingBusy, setGradingBusy] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [gradingSuccess, setGradingSuccess] = useState<string | null>(null)

  // 3. Leaderboard Drawer State
  const [leaderboardDrawerOpen, setLeaderboardDrawerOpen] = useState(false)
  const [activeLeaderboard, setActiveLeaderboard] = useState<StudentExamLeaderboard[]>([])
  const [leaderboardExam, setLeaderboardExam] = useState<ExamListItem | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const loadData = async () => {
    if (!organization?.id) return
    try {
      setLoading(true)
      setError(null)
      const [examsData, groupsData, teachersData] = await Promise.all([
        listExams(organization.id, selectedGroupId),
        listGroupsForExams(organization.id),
        listTeachersForSelect(organization.id),
      ])
      setExams(examsData)
      setGroups(groupsData)
      setTeachers(teachersData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Imtihonlarni yuklashda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organization?.id) {
      void loadData()
    }
  }, [organization?.id, selectedGroupId])

  // Open Create Exam
  const handleOpenCreate = () => {
    const defaultGroup = groups[0]
    setExamForm({
      title: '',
      subject: defaultGroup?.subject || '',
      group_id: defaultGroup?.id || '',
      teacher_id: defaultGroup?.teacher_id || '',
      exam_date: new Date().toISOString().split('T')[0],
      maximum_score: 100,
    })
    setCreateError(null)
    setCreateDrawerOpen(true)
  }

  // Handle Create Exam
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization?.id) return
    try {
      setCreateBusy(true)
      setCreateError(null)
      await createExam(organization.id, examForm, profile?.id)
      setCreateDrawerOpen(false)
      await loadData()
    } catch (err: unknown) {
      setCreateError(friendlyExamError(err as any))
    } finally {
      setCreateBusy(false)
    }
  }

  // Open Grading Drawer
  const handleOpenGrading = async (exam: ExamListItem) => {
    if (!organization?.id) return
    try {
      setGradingBusy(true)
      setGradingError(null)
      setGradingSuccess(null)
      setGradingDrawerOpen(true)
      const detail = await getExamDetail(organization.id, exam.id)
      if (detail) {
        setActiveExamDetail(detail)
        const initialMap: Record<string, { score: number | string; comment: string }> = {}
        detail.results.forEach((r) => {
          initialMap[r.student_id] = {
            score: r.score ?? 0,
            comment: r.teacher_comment ?? '',
          }
        })
        setGradingScores(initialMap)
      }
    } catch (err: unknown) {
      setGradingError(err instanceof Error ? err.message : 'Natijalarni yuklashda xatolik.')
    } finally {
      setGradingBusy(false)
    }
  }

  // Handle Score Input Change
  const handleScoreChange = (studentId: string, scoreVal: string) => {
    setGradingScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: scoreVal,
      },
    }))
  }

  // Handle Comment Input Change
  const handleCommentChange = (studentId: string, commentVal: string) => {
    setGradingScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comment: commentVal,
      },
    }))
  }

  // Save Exam Results Bulk
  const handleSaveResults = async () => {
    if (!organization?.id || !activeExamDetail) return
    try {
      setGradingBusy(true)
      setGradingError(null)
      setGradingSuccess(null)

      const resultsInput: ExamResultInput[] = activeExamDetail.results.map((r) => {
        const item = gradingScores[r.student_id]
        return {
          studentId: r.student_id,
          score: Number(item?.score) || 0,
          comment: item?.comment,
        }
      })

      const res = await recordExamResultsBulk(
        organization.id,
        activeExamDetail.id,
        resultsInput,
        profile?.id,
      )

      setGradingSuccess(`${res.savedCount} ta o'quvchi natijasi muvaffaqiyatli saqlandi!`)
      await loadData()
      // Reload active detail
      const refreshed = await getExamDetail(organization.id, activeExamDetail.id)
      if (refreshed) setActiveExamDetail(refreshed)
    } catch (err: unknown) {
      setGradingError(friendlyExamError(err as any))
    } finally {
      setGradingBusy(false)
    }
  }

  // Open Leaderboard Drawer
  const handleOpenLeaderboard = async (exam: ExamListItem) => {
    if (!organization?.id) return
    try {
      setLeaderboardExam(exam)
      setLeaderboardLoading(true)
      setLeaderboardDrawerOpen(true)
      const data = await getExamLeaderboard(organization.id, exam.id)
      setActiveLeaderboard(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reytingni yuklashda xatolik.')
    } finally {
      setLeaderboardLoading(false)
    }
  }

  // Overall KPIs
  const stats = useMemo(() => {
    const total = exams.length
    const gradedCount = exams.reduce((acc, e) => acc + e.results_count, 0)
    const avgSum = exams.filter((e) => e.results_count > 0).map((e) => e.average_score)
    const avgOverall =
      avgSum.length > 0 ? Math.round((avgSum.reduce((a, b) => a + b, 0) / avgSum.length) * 10) / 10 : 0
    const topScore = exams.length > 0 ? Math.max(...exams.map((e) => e.highest_score)) : 0
    return { total, gradedCount, avgOverall, topScore }
  }, [exams])

  const filteredExams = useMemo(() => {
    if (!search.trim()) return exams
    const term = search.toLowerCase()
    return exams.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        e.subject.toLowerCase().includes(term) ||
        e.group_name.toLowerCase().includes(term),
    )
  }, [exams, search])

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
        badge="Phase 2 - O'quv & Natijalar"
        title="Imtihonlar & Reyting"
        description="Guruhlar bo'yicha oraliq va yakuniy testlar, baholash tizimi va interaktiv neon liderlar jadvali."
        actions={
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Yangi Imtihon Yaratish</span>
          </Button>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Jami Imtihonlar"
          value={String(stats.total)}
          hint="O'tkazilgan va rejalashtirilgan sinovlar"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Baholangan Natijalar"
          value={String(stats.gradedCount)}
          hint="Jami kiritilgan o'quvchi baholari"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="O'rtacha Ball"
          value={`${stats.avgOverall}`}
          hint="Markaz bo'yicha o'rtacha imtihon ko'rsatkichi"
          icon={<GraduationCap className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="Eng Yuqori Natija"
          value={`${stats.topScore}`}
          hint="Talabalar tomonidan qayd etilgan eng yuqori ball"
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
          <Input
            placeholder="Imtihon nomi, fan yoki guruh bo'yicha qidirish..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-[rgb(var(--muted))]" />
          <Select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-56"
          >
            <option value="ALL">Barcha guruhlar</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.subject})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <LoadingState message="Imtihonlar ro'yxati yuklanmoqda..." />
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-400">
          {error}
        </div>
      ) : filteredExams.length === 0 ? (
        <EmptyState
          title="Imtihonlar topilmadi"
          description="Hozircha birorta ham imtihon tashkil etilmagan. Yangi imtihon yaratishingiz mumkin."
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Imtihon yaratish</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const hasResults = exam.results_count > 0

            return (
              <Card
                key={exam.id}
                className="group relative flex flex-col justify-between overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm transition hover:shadow-md hover:border-amber-500/40"
              >
                {/* Glow bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/70 to-purple-500/0 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="space-y-4">
                  {/* Subject & Group tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-lg bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20">
                        {exam.subject}
                      </span>
                      <h3 className="mt-2 text-base font-black tracking-tight text-[rgb(var(--text))] group-hover:text-amber-600 transition">
                        {exam.title}
                      </h3>
                    </div>
                    <Badge variant={hasResults ? 'success' : 'warning'}>
                      {hasResults ? `${exam.results_count} ta baholangan` : 'Kutilmoqda'}
                    </Badge>
                  </div>

                  {/* Group & Date & Max Score info */}
                  <div className="space-y-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] p-3 text-xs">
                    <div className="flex items-center justify-between text-[rgb(var(--muted))]">
                      <span>Guruh:</span>
                      <span className="font-bold text-[rgb(var(--text))]">{exam.group_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[rgb(var(--muted))]">
                      <span>Sana:</span>
                      <span className="font-semibold text-[rgb(var(--text))]">{formatDate(exam.exam_date)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[rgb(var(--muted))]">
                      <span>Maksimal ball:</span>
                      <span className="font-bold text-amber-600">{exam.maximum_score} ball</span>
                    </div>
                  </div>

                  {/* Score Highlights */}
                  {hasResults ? (
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-2">
                        <p className="text-[11px] text-[rgb(var(--muted))]">O'rtacha ball</p>
                        <p className="text-base font-black text-blue-600 mt-0.5">
                          {exam.average_score}{' '}
                          <span className="text-[11px] font-normal text-[rgb(var(--muted))]">
                            ({Math.round((exam.average_score / exam.maximum_score) * 100)}%)
                          </span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2">
                        <p className="text-[11px] text-[rgb(var(--muted))]">Top natija</p>
                        <p className="text-base font-black text-emerald-600 mt-0.5">
                          {exam.highest_score} ball
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-3 text-center text-xs text-[rgb(var(--muted))]">
                      O'quvchilar natijalari hali kiritilmagan.
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 flex items-center justify-between gap-2 border-t border-[rgb(var(--border))] pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenGrading(exam)}
                    className="gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>Natijalarni kiritish</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenLeaderboard(exam)}
                    className="gap-1.5 text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Reyting</span>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Drawer 1: Create Exam */}
      <Drawer
        open={createDrawerOpen}
        title="Yangi Imtihon Yaratish"
        description="Guruh, fan va maksimal ballni belgilab yangi imtihon sinovini boshlang."
        onClose={() => setCreateDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateDrawerOpen(false)}
              disabled={createBusy}
            >
              Bekor qilish
            </Button>
            <Button type="submit" form="create-exam-form" disabled={createBusy}>
              {createBusy ? 'Yaratilmoqda...' : 'Imtihonni yaratish'}
            </Button>
          </div>
        }
      >
        <form id="create-exam-form" onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400">
              {createError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[rgb(var(--text))]">
              Imtihon Nomi <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Masalan: Unit 3 Progress Test yoki Mock Exam #1"
              value={examForm.title}
              onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[rgb(var(--text))]">
              Guruh <span className="text-rose-500">*</span>
            </label>
            <Select
              required
              value={examForm.group_id}
              onChange={(e) => {
                const g = groups.find((grp) => grp.id === e.target.value)
                setExamForm({
                  ...examForm,
                  group_id: e.target.value,
                  subject: g?.subject || examForm.subject,
                  teacher_id: g?.teacher_id || examForm.teacher_id,
                })
              }}
            >
              <option value="">Guruhni tanlang</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.subject})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[rgb(var(--text))]">
                Fan <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                value={examForm.subject}
                onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[rgb(var(--text))]">O'qituvchi</label>
              <Select
                value={examForm.teacher_id}
                onChange={(e) => setExamForm({ ...examForm, teacher_id: e.target.value })}
              >
                <option value="">Tanlanmagan</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[rgb(var(--text))]">
                Imtihon Sanasi <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={examForm.exam_date}
                onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[rgb(var(--text))]">
                Maksimal Ball <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="1000"
                required
                value={examForm.maximum_score}
                onChange={(e) => setExamForm({ ...examForm, maximum_score: Number(e.target.value) || 100 })}
              />
            </div>
          </div>
        </form>
      </Drawer>

      {/* Drawer 2: Bulk Grade Entry */}
      <Drawer
        open={gradingDrawerOpen}
        title={`Natijalarni Baholash: ${activeExamDetail?.title || ''}`}
        description={`Guruh: ${activeExamDetail?.group_name || ''} • Maksimal ball: ${activeExamDetail?.maximum_score || 100}`}
        onClose={() => setGradingDrawerOpen(false)}
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-[rgb(var(--muted))]">
              {activeExamDetail?.results.length || 0} ta o'quvchi ro'yxati
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGradingDrawerOpen(false)}
                disabled={gradingBusy}
              >
                Yopish
              </Button>
              <Button
                type="button"
                onClick={handleSaveResults}
                disabled={gradingBusy || !activeExamDetail}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                <span>{gradingBusy ? 'Saqlanmoqda...' : 'Natijalarni Saqlash'}</span>
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {gradingSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-600">
              <Check className="h-4 w-4 shrink-0" />
              <span>{gradingSuccess}</span>
            </div>
          )}

          {gradingError && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{gradingError}</span>
            </div>
          )}

          {!activeExamDetail || activeExamDetail.results.length === 0 ? (
            <div className="p-8 text-center text-xs text-[rgb(var(--muted))]">
              Ushbu guruhda hali o'quvchilar yo'q. Guruh tafsilotlari sahifasidan o'quvchi qo'shing.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border))]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))] uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">O'quvchi</th>
                    <th className="px-4 py-3 w-28">To'plangan Ball</th>
                    <th className="px-4 py-3 text-center w-24">Foiz & Baho</th>
                    <th className="px-4 py-3">O'qituvchi Izohi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {activeExamDetail.results.map((student) => {
                    const currentScore = Number(gradingScores[student.student_id]?.score) || 0
                    const maxScore = activeExamDetail.maximum_score || 100
                    const percentage = Math.min(100, Math.max(0, Math.round((currentScore / maxScore) * 100 * 10) / 10))
                    const grade = calculateGrade(percentage)

                    return (
                      <tr key={student.student_id} className="hover:bg-[rgb(var(--surface-soft))]/60 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600">
                                {student.first_name[0]}{student.last_name[0]}
                              </div>
                            )}
                            <span className="font-bold text-[rgb(var(--text))]">
                              {student.student_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            max={maxScore}
                            value={gradingScores[student.student_id]?.score ?? ''}
                            onChange={(e) => handleScoreChange(student.student_id, e.target.value)}
                            className="h-8 text-xs font-bold w-24"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="font-extrabold text-xs text-[rgb(var(--text))]">
                              {percentage}%
                            </span>
                            <Badge variant={gradeBadgeVariant(grade)} className="px-2 py-0 text-[10px]">
                              Baho: {grade}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            placeholder="Izoh yoki tavsiya..."
                            value={gradingScores[student.student_id]?.comment ?? ''}
                            onChange={(e) => handleCommentChange(student.student_id, e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Drawer>

      {/* Drawer 3: Interactive Leaderboard View */}
      <Drawer
        open={leaderboardDrawerOpen}
        title={`🏆 Liderlar Jadvali: ${leaderboardExam?.title || ''}`}
        description={`${leaderboardExam?.group_name || ''} guruhi natijalari reytingi`}
        onClose={() => setLeaderboardDrawerOpen(false)}
        className="max-w-2xl"
      >
        <div className="space-y-6">
          {leaderboardLoading ? (
            <LoadingState message="Liderlar jadvali hisoblanmoqda..." />
          ) : activeLeaderboard.length === 0 ? (
            <EmptyState
              title="Reyting maʼlumotlari mavjud emas"
              description="Ushbu imtihon uchun natijalar kiritilmagan."
            />
          ) : (
            <>
              {/* Top 3 Podium */}
              {activeLeaderboard.length >= 2 && (
                <div className="grid grid-cols-3 gap-3 items-end pt-4 pb-2">
                  {/* 2nd Place */}
                  {activeLeaderboard[1] && (
                    <Card className="flex flex-col items-center p-3 text-center border-slate-300 dark:border-slate-700 bg-slate-500/5 order-1">
                      <span className="text-2xl">🥈</span>
                      <p className="mt-1 font-bold text-xs truncate max-w-full text-[rgb(var(--text))]">
                        {activeLeaderboard[1].student_name}
                      </p>
                      <p className="text-sm font-black text-slate-500 mt-0.5">
                        {activeLeaderboard[1].score} ball
                      </p>
                      <span className="text-[10px] text-[rgb(var(--muted))]">
                        {activeLeaderboard[1].percentage}%
                      </span>
                    </Card>
                  )}

                  {/* 1st Place (Champion) */}
                  {activeLeaderboard[0] && (
                    <Card className="flex flex-col items-center p-4 text-center border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/10 relative order-0 -translate-y-2">
                      <div className="absolute -top-3 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-slate-950 uppercase tracking-widest">
                        G'olib
                      </div>
                      <span className="text-3xl">🥇</span>
                      <p className="mt-2 font-black text-sm truncate max-w-full text-[rgb(var(--text))]">
                        {activeLeaderboard[0].student_name}
                      </p>
                      <p className="text-lg font-black text-amber-500 mt-0.5">
                        {activeLeaderboard[0].score} ball
                      </p>
                      <span className="text-xs font-bold text-amber-600">
                        {activeLeaderboard[0].percentage}% (A)
                      </span>
                    </Card>
                  )}

                  {/* 3rd Place */}
                  {activeLeaderboard[2] && (
                    <Card className="flex flex-col items-center p-3 text-center border-amber-800/30 bg-amber-800/5 order-2">
                      <span className="text-2xl">🥉</span>
                      <p className="mt-1 font-bold text-xs truncate max-w-full text-[rgb(var(--text))]">
                        {activeLeaderboard[2].student_name}
                      </p>
                      <p className="text-sm font-black text-amber-700 mt-0.5">
                        {activeLeaderboard[2].score} ball
                      </p>
                      <span className="text-[10px] text-[rgb(var(--muted))]">
                        {activeLeaderboard[2].percentage}%
                      </span>
                    </Card>
                  )}
                </div>
              )}

              {/* Leaderboard List with Neon Progress Bars */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                  Barcha O'quvchilar Reytingi
                </p>

                <div className="space-y-2.5">
                  {activeLeaderboard.map((item) => {
                    const isTop3 = item.rank <= 3

                    return (
                      <div
                        key={item.student_id}
                        className={`rounded-2xl border p-3.5 transition ${
                          item.rank === 1
                            ? 'border-amber-500/40 bg-amber-500/5 shadow-sm'
                            : item.rank === 2
                            ? 'border-slate-400/40 bg-slate-400/5'
                            : item.rank === 3
                            ? 'border-amber-700/30 bg-amber-700/5'
                            : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                                item.rank === 1
                                  ? 'bg-amber-500 text-slate-950 shadow-md'
                                  : item.rank === 2
                                  ? 'bg-slate-400 text-slate-950'
                                  : item.rank === 3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))]'
                              }`}
                            >
                              {item.rank}
                            </span>
                            <span className="font-bold text-xs text-[rgb(var(--text))]">
                              {item.student_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-[rgb(var(--text))]">
                              {item.score} / {item.maximum_score}
                            </span>
                            <Badge variant={gradeBadgeVariant(item.grade)} className="px-2 py-0 text-[10px]">
                              {item.grade} ({item.percentage}%)
                            </Badge>
                          </div>
                        </div>

                        {/* Neon Glowing Progress Bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--surface-soft))] border border-[rgb(var(--border))]">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              item.percentage >= 90
                                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                                : item.percentage >= 80
                                ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]'
                                : item.percentage >= 70
                                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                                : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </Drawer>
    </div>
  )
}
