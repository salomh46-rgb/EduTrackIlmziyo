import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Award,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Info,
  Phone,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react'
import {
  fetchParentPortalData,
  buildClickPaymentUrl,
  buildPaymePaymentUrl,
  openExternalUrl,
} from '../api/parentPortalApi'
import type {
  ParentPortalData,
  AttendanceStatus,
} from '../types'

type TabType = 'attendance' | 'exams' | 'finance'

export function ParentPortalPage() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<ParentPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const [selectedPayAmount, setSelectedPayAmount] = useState<number>(800000)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const token = searchParams.get('token')
  const studentId = searchParams.get('student_id') || searchParams.get('studentId')
  const telegramUserId =
    searchParams.get('telegram_user_id') ||
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  const isDemoParam = searchParams.get('demo') === 'true'

  // Initialize Telegram WebApp hooks
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      try {
        tg.ready()
        tg.expand()
        // Set Telegram colors if available
        if (tg.setHeaderColor) tg.setHeaderColor('#0f172a')
        if (tg.setBackgroundColor) tg.setBackgroundColor('#020617')
      } catch (e) {
        console.warn('Telegram WebApp setup notice:', e)
      }
    }
  }, [])

  // Fetch parent portal data
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await fetchParentPortalData({
        token,
        student_id: studentId,
        telegram_user_id: telegramUserId,
        demo: isDemoParam,
      })
      setData(result)
    } catch (err) {
      console.error('Failed to load parent portal data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, studentId, telegramUserId, isDemoParam])

  // Sync Telegram MainButton & BackButton
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    // Back button handling
    if (tg.BackButton) {
      if (isPaymentModalOpen) {
        tg.BackButton.show()
        const handleBack = () => setIsPaymentModalOpen(false)
        tg.BackButton.onClick(handleBack)
        return () => {
          tg.BackButton.offClick(handleBack)
          tg.BackButton.hide()
        }
      } else {
        tg.BackButton.hide()
      }
    }

    // Main button handling
    if (tg.MainButton) {
      if (activeTab === 'finance' || isPaymentModalOpen) {
        tg.MainButton.setText("💳 Click / Payme orqali to'lash")
        tg.MainButton.show()
        const handleMain = () => {
          triggerHaptic('medium')
          setIsPaymentModalOpen(true)
        }
        tg.MainButton.onClick(handleMain)
        return () => {
          tg.MainButton.offClick(handleMain)
          tg.MainButton.hide()
        }
      } else {
        tg.MainButton.hide()
      }
    }
  }, [activeTab, isPaymentModalOpen])

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style)
  }

  // Attendance stats breakdown
  const attendanceStats = useMemo(() => {
    if (!data?.attendance) return { present: 0, late: 0, excused: 0, absent: 0, total: 0 }
    const items = data.attendance
    return {
      present: items.filter((i) => i.status === 'PRESENT').length,
      late: items.filter((i) => i.status === 'LATE').length,
      excused: items.filter((i) => i.status === 'EXCUSED').length,
      absent: items.filter((i) => i.status === 'ABSENT').length,
      total: items.length,
    }
  }, [data?.attendance])

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('uz-UZ').format(val) + " so'm"
  }

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" /> Qatnashdi
          </span>
        )
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <Clock className="w-3.5 h-3.5" /> Kechikdi
          </span>
        )
      case 'EXCUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <Info className="w-3.5 h-3.5" /> Sababli
          </span>
        )
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <XCircle className="w-3.5 h-3.5" /> Kelmadi
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-full border-4 border-sky-500/30 border-t-sky-500 animate-spin" />
          <Sparkles className="w-6 h-6 text-sky-400 absolute animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-400">EduTrack Ilmziyo yuklanmoqda...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Ma'lumot topilmadi</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-xs">
          O'quvchi ma'lumotlari topilmadi yoki tasdiqlash muddati tugagan.
        </p>
        <button
          onClick={loadData}
          className="btn-tactile px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 font-semibold text-white inline-flex items-center gap-2 shadow-lg shadow-sky-500/25"
        >
          <RefreshCw className="w-4 h-4" /> Qaytadan tekshirish
        </button>
      </div>
    )
  }

  const { student, exams, finance, organization } = data

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-sky-500/30">
      {/* Top Ambient Light Flare */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-40 bg-gradient-to-b from-sky-500/15 via-indigo-500/5 to-transparent pointer-events-none blur-2xl" />

      {/* Main Container constrained to Mobile Viewport */}
      <div className="max-w-md mx-auto relative px-4 pt-3 pb-8">
        {/* Brand Bar */}
        <header className="flex items-center justify-between py-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20 text-xs">
              IZ
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {organization.name}
              </h1>
              <p className="text-[10px] text-slate-400">Ota-onalar interaktiv portali</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {data.is_demo && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-3 h-3" /> Demo
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Telegram Bot
            </span>
          </div>
        </header>

        {/* ============================================================
            HERO CARD: Student Profile & Master Performance Ring
           ============================================================ */}
        <section className="relative rounded-3xl p-5 mb-5 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Animated decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/25">
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center overflow-hidden">
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-sky-400" />
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                  {student.full_name}
                </h2>
                <p className="text-xs font-medium text-sky-400 mt-0.5 flex items-center gap-1">
                  <span>{student.group_name}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ustoz: <span className="text-slate-300">{student.teacher_name || 'Katta ustoz'}</span>
                </p>
              </div>
            </div>

            {/* Circular Mastery Score Badge */}
            <div className="flex flex-col items-center">
              <div className="relative w-14 h-14 rounded-full bg-slate-800/80 border border-sky-500/30 flex items-center justify-center shadow-inner">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-sky-400 transition-all duration-1000 ease-out"
                    strokeDasharray={`${student.average_score}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-black text-white">
                  {Math.round(student.average_score)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">O'zlashtirish</span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center">
            <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                Davomat
              </span>
              <span className="text-sm font-bold text-emerald-400">
                {student.attendance_rate}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                Darslar
              </span>
              <span className="text-sm font-bold text-sky-400">
                {student.total_attended_lessons}/{student.total_scheduled_lessons}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                To'lov
              </span>
              <span
                className={`text-sm font-bold ${
                  finance.is_overdue ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {finance.is_overdue ? 'Qarz' : 'To\'langan'}
              </span>
            </div>
          </div>
        </section>

        {/* ============================================================
            NAVIGATION TABS (Davomat, Baholar & Imtihonlar, To'lovlar)
           ============================================================ */}
        <div className="flex rounded-2xl p-1 bg-slate-900/90 border border-slate-800 mb-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              setActiveTab('attendance')
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Davomat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              setActiveTab('exams')
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'exams'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Baholar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              setActiveTab('finance')
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'finance'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>To'lovlar</span>
            {finance.is_overdue && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* ============================================================
            TAB 1: DAVOMAT (Oxirgi 30 kunlik davomat)
           ============================================================ */}
        {activeTab === 'attendance' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {/* Attendance Analytics Summary */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-base font-bold text-emerald-400">
                  {attendanceStats.present}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Kelgan</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-base font-bold text-amber-400">
                  {attendanceStats.late}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Kechikkan</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-base font-bold text-blue-400">
                  {attendanceStats.excused}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Sababli</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-base font-bold text-rose-400">
                  {attendanceStats.absent}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Kelmadi</span>
              </div>
            </div>

            {/* Attendance List */}
            <div className="rounded-3xl p-4 bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-sky-400" />
                  Oxirgi 30 kunlik davomat taqvimi
                </h3>
                <span className="text-[11px] text-slate-500">
                  Jami: {data.attendance.length} ta dars
                </span>
              </div>

              {data.attendance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Hozircha davomat yozuvlari mavjud emas.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.attendance.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white">
                              {item.lesson_date}
                            </span>
                            {item.lesson_title && (
                              <span className="text-[11px] text-sky-400 font-medium">
                                • {item.lesson_title}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 font-medium leading-snug">
                            {item.topic || 'Dars mavzusi kiritilmagan'}
                          </p>
                          {item.note && (
                            <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/50">
                              💬 {item.note}
                            </p>
                          )}
                        </div>
                        <div>{getStatusBadge(item.status)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: BAHOLAR & IMTIHONLAR
           ============================================================ */}
        {activeTab === 'exams' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {/* Performance banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-slate-900 border border-sky-500/20 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                  O'rtacha ko'rsatkich
                </span>
                <h4 className="text-2xl font-black text-white mt-0.5">
                  {student.average_score}%
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Barcha test va nazorat ishlari bo'yicha
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Exam results list */}
            <div className="space-y-3">
              {exams.length === 0 ? (
                <div className="rounded-3xl p-6 bg-slate-900/80 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    Hozircha imtihon yoki test natijalari kiritilmagan.
                  </p>
                </div>
              ) : (
                exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                          {exam.subject}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                          {exam.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Sana: {exam.exam_date}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-400">
                          {exam.score}
                          <span className="text-xs text-slate-400 font-semibold">
                            /{exam.maximum_score}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-block mt-0.5">
                          {exam.grade}
                        </span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, exam.percentage))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                        <span>Natija foizi:</span>
                        <span className="text-sky-400 font-bold">{exam.percentage}%</span>
                      </div>
                    </div>

                    {/* Teacher comment */}
                    {exam.teacher_comment && (
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                        <span className="font-semibold text-sky-400 block mb-0.5">
                          👨‍🏫 Ustoz izohi:
                        </span>
                        "{exam.teacher_comment}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: TO'LOVLAR & QARZ (Balans, Click/Payme)
           ============================================================ */}
        {activeTab === 'finance' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Rotating border-beam / glass balance card */}
            <div className="border-beam-container rounded-3xl p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative">
              <div className="border-beam-line" />
              <div className="relative z-10">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Hisob holati (Balans)</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      finance.is_overdue
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {finance.is_overdue ? 'Qarzdorlik bor' : 'Qarzdorlik yo\'q'}
                  </span>
                </div>

                <div className="text-3xl font-black text-white tracking-tight mt-1">
                  {formatMoney(finance.balance_amount)}
                </div>

                {finance.next_due_date && (
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Keyingi to'lov sanasi:{' '}
                    <span className="text-white font-semibold">{finance.next_due_date}</span>
                  </p>
                )}

                {/* Instant Action Button */}
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium')
                      setSelectedPayAmount(800000)
                      setIsPaymentModalOpen(true)
                    }}
                    className="btn-tactile py-2.5 px-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>To'lov qilish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light')
                      openExternalUrl(`tel:${organization.phone.replace(/\s+/g, '')}`)
                    }}
                    className="btn-tactile py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    <span>Bog'lanish</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Payment history receipts */}
            <div className="rounded-3xl p-4 bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-sky-400" />
                To'lovlar tarixi & kvitansiyalar
              </h3>

              {finance.history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  To'lovlar tarixi topilmadi.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {finance.history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {formatMoney(item.amount)}
                          </span>
                          {item.method && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {item.method}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Sana: {item.payment_date || item.due_date || '-'}
                        </p>
                        {item.receipt_id && (
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Kvitansiya: {item.receipt_id}
                          </p>
                        )}
                      </div>

                      <div>
                        {item.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            <CheckCircle2 className="w-3.5 h-3.5" /> To'langan
                          </span>
                        ) : item.status === 'OVERDUE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                            <Clock className="w-3.5 h-3.5" /> Muddati o'tgan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            <Clock className="w-3.5 h-3.5" /> Kutilmoqda
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            PAYMENT MODAL / DRAWER (Click & Payme Integration)
           ============================================================ */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">To'lov usulini tanlang</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  To'lov miqdori:
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[400000, 800000, 1600000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light')
                        setSelectedPayAmount(amt)
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                        selectedPayAmount === amt
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300'
                      }`}
                    >
                      {new Intl.NumberFormat('uz-UZ').format(amt)}
                    </button>
                  ))}
                </div>
                <div className="text-xl font-black text-white text-center py-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {formatMoney(selectedPayAmount)}
                </div>
              </div>

              {/* Click and Payme checkout options */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium')
                    const url = buildClickPaymentUrl({
                      amount: selectedPayAmount,
                      studentId: student.id,
                    })
                    openExternalUrl(url)
                  }}
                  className="btn-tactile w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-sm flex items-center justify-between shadow-lg shadow-blue-500/20"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">
                      CL
                    </div>
                    <span>Click Up orqali to'lash</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium')
                    const url = buildPaymePaymentUrl({
                      amount: selectedPayAmount,
                      studentId: student.id,
                    })
                    openExternalUrl(url)
                  }}
                  className="btn-tactile w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm flex items-center justify-between shadow-lg shadow-teal-500/20"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">
                      PM
                    </div>
                    <span>Payme orqali to'lash</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="mt-8 pt-4 border-t border-slate-900 text-center text-[11px] text-slate-500 space-y-1">
          <p>{organization.name} • Barcha huquqlar himoyalangan</p>
          <p>
            Savollar bo'yicha markaz ma'muriyati:{' '}
            <a
              href={`tel:${organization.phone.replace(/\s+/g, '')}`}
              className="text-sky-400 underline font-medium"
            >
              {organization.phone}
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
