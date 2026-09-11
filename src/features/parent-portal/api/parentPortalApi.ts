// Parent Portal and Telegram Mini App Data Layer

import { supabase } from '@/lib/supabase/client'
import type {
  ParentPortalData,
  ParentPortalAttendanceItem,
  ParentPortalExamItem,
  ParentPortalPaymentItem,
} from '../types'

// Realistic fallback demo data for immediate browser preview or unlinked state
const mockParentPortalData: ParentPortalData = {
  is_demo: true,
  parent_name: 'Dilshodbek Rahimov',
  student: {
    id: 'demo-student-001',
    first_name: 'Jasurbek',
    last_name: 'Rahimov',
    full_name: 'Jasurbek Rahimov',
    avatar_url: null,
    phone: '+998 90 123 45 67',
    group_name: 'IELTS Master 7.5+',
    subject: 'Ingliz tili (Intensive)',
    teacher_name: 'Alisher Qodirov (IELTS 8.5)',
    attendance_rate: 94.2,
    average_score: 91.5,
    total_attended_lessons: 26,
    total_scheduled_lessons: 28,
  },
  attendance: [
    {
      id: 'att-1',
      lesson_date: '2026-09-10',
      status: 'PRESENT',
      topic: 'Academic Writing Task 2: Opinion Essays & Structure',
      lesson_title: '14-dars: Essay Blueprinting',
      note: 'Faol qatnashdi, intizomi a\'lo darajada.',
    },
    {
      id: 'att-2',
      lesson_date: '2026-09-08',
      status: 'PRESENT',
      topic: 'Listening Section 4: Academic Lectures & Note-taking',
      lesson_title: '13-dars: Deep Listening',
      note: 'Barcha test savollariga to\'g\'ri javob berdi.',
    },
    {
      id: 'att-3',
      lesson_date: '2026-09-05',
      status: 'LATE',
      topic: 'Reading: True / False / Not Given Mastery',
      lesson_title: '12-dars: Reading Speed Tactics',
      note: 'Transport sababli 10 daqiqa kechikdi.',
    },
    {
      id: 'att-4',
      lesson_date: '2026-09-03',
      status: 'PRESENT',
      topic: 'Speaking Part 2: Cue Card Storytelling & Idioms',
      lesson_title: '11-dars: Fluent Speaking Flow',
      note: 'Talaffuz va so\'z boyligi juda yaxshi.',
    },
    {
      id: 'att-5',
      lesson_date: '2026-09-01',
      status: 'ABSENT',
      topic: 'Grammar: Advanced Inversion & Conditionals',
      lesson_title: '10-dars: Advanced Structures',
      note: 'Darsga kelmadi (Ota-onaga SMS xabarnoma yuborilgan).',
    },
    {
      id: 'att-6',
      lesson_date: '2026-08-28',
      status: 'PRESENT',
      topic: 'Writing Task 1: Comparative Bar Charts',
      lesson_title: '9-dars: Visual Data Synthesis',
      note: 'Grafik tahlilini muvaffaqiyatli topshirdi.',
    },
    {
      id: 'att-7',
      lesson_date: '2026-08-26',
      status: 'EXCUSED',
      topic: 'Vocabulary: Environment & Climate Change Lexis',
      lesson_title: '8-dars: Topic-Specific Vocab',
      note: 'Tibbiy ko\'rik sababli ota-onasi oldindan ogohlantirgan.',
    },
    {
      id: 'att-8',
      lesson_date: '2026-08-23',
      status: 'PRESENT',
      topic: 'Reading: Headings Matching & Speed Skimming',
      lesson_title: '7-dars: Headings Strategy',
      note: '100% to\'g\'ri ishladi.',
    },
  ],
  exams: [
    {
      id: 'exam-1',
      title: 'Monthly Progress Mock Exam #3',
      subject: 'IELTS Full Simulation',
      exam_date: '2026-09-07',
      score: 7.5,
      maximum_score: 9.0,
      percentage: 88.5,
      grade: 'Band 7.5 (A+)',
      teacher_comment: 'Writing bo\'yicha ajoyib o\'sish kuzatildi. Speakingda yana ham erkinroq bo\'lish tavsiya etiladi.',
    },
    {
      id: 'exam-2',
      title: 'Midterm Reading & Listening Blitz',
      subject: 'Reading & Listening',
      exam_date: '2026-08-25',
      score: 38,
      maximum_score: 40,
      percentage: 95.0,
      grade: 'Band 8.5 (A+)',
      teacher_comment: 'Sinfdagi eng yuqori natijalardan biri! Barakalla.',
    },
    {
      id: 'exam-3',
      title: 'Vocabulary & Grammar Diagnostic',
      subject: 'English Grammar & Lexis',
      exam_date: '2026-08-12',
      score: 92,
      maximum_score: 100,
      percentage: 92.0,
      grade: 'A',
      teacher_comment: 'C1 darajadagi murakkab gap tuzilmalarini mukammal o\'zlashtirgan.',
    },
  ],
  finance: {
    balance_amount: 0,
    total_paid: 1600000,
    total_due: 0,
    next_due_date: '2026-10-05',
    last_payment_date: '2026-09-02',
    currency: 'so\'m',
    is_overdue: false,
    history: [
      {
        id: 'pay-001',
        amount: 800000,
        payment_date: '2026-09-02',
        due_date: '2026-09-05',
        status: 'PAID',
        method: 'Click Up',
        note: 'Sentyabr oyi uchun oylik to\'lov',
        receipt_id: 'REC-90821',
      },
      {
        id: 'pay-002',
        amount: 800000,
        payment_date: '2026-08-03',
        due_date: '2026-08-05',
        status: 'PAID',
        method: 'Payme',
        note: 'Avgust oyi uchun oylik to\'lov',
        receipt_id: 'REC-74512',
      },
      {
        id: 'pay-003',
        amount: 800000,
        due_date: '2026-10-05',
        status: 'PENDING',
        method: null,
        note: 'Oktyabr oyi uchun rejali to\'lov',
        receipt_id: null,
      },
    ],
  },
  organization: {
    id: 'org-ilmziyo',
    name: 'EduTrack Ilmziyo O\'quv Markazi',
    phone: '+998 71 200 45 45',
    address: 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko\'chasi 107-uy',
    support_telegram: '@ilmziyo_admin',
  },
}

export type FetchPortalOptions = {
  token?: string | null
  telegram_user_id?: string | number | null
  student_id?: string | null
  demo?: boolean | null
}

export async function fetchParentPortalData(
  options: FetchPortalOptions = {}
): Promise<ParentPortalData> {
  // If explicitly demo requested or no database client, return realistic demo data
  if (options.demo || !supabase) {
    return mockParentPortalData
  }

  try {
    // 1. Try Supabase RPC get_parent_portal_data
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_parent_portal_data', {
      p_token: options.token || null,
      p_telegram_user_id: options.telegram_user_id ? Number(options.telegram_user_id) : null,
      p_student_id: options.student_id || null,
    })

    if (!rpcError && rpcData && rpcData.found) {
      const student = rpcData.student
      const attendance = (rpcData.attendance || []) as ParentPortalAttendanceItem[]
      const exams = (rpcData.exams || []) as ParentPortalExamItem[]
      const payments = rpcData.payments || {}
      const org = rpcData.organization || {}

      const attendedCount = attendance.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length

      return {
        is_demo: false,
        parent_name: null,
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          full_name: student.full_name || `${student.first_name} ${student.last_name}`,
          avatar_url: student.avatar_url,
          phone: student.phone,
          group_name: student.group_name || 'Asosiy guruh',
          subject: student.subject || 'Darslar',
          teacher_name: student.teacher_name || 'Ustoz',
          attendance_rate: Number(student.attendance_rate ?? 100),
          average_score: Number(student.average_score ?? 0),
          total_attended_lessons: attendedCount,
          total_scheduled_lessons: attendance.length,
        },
        attendance,
        exams,
        finance: {
          balance_amount: Number(payments.balance ?? 0),
          total_paid: Number(payments.total_paid ?? 0),
          total_due: Number(payments.total_due ?? 0),
          next_due_date: null,
          last_payment_date: null,
          currency: 'so\'m',
          is_overdue: Boolean(payments.is_overdue),
          history: (payments.history || []) as ParentPortalPaymentItem[],
        },
        organization: {
          id: org.id || 'org',
          name: org.name || 'EduTrack Ilmziyo',
          phone: '+998 71 200 45 45',
          address: 'Toshkent sh., Ilmziyo markazi',
          support_telegram: '@ilmziyo_admin',
        },
      }
    }
  } catch (err) {
    console.warn('Parent portal RPC call failed, falling back to mock preview:', err)
  }

  // Graceful fallback to mock data
  return mockParentPortalData
}

/**
 * Generate Click payment checkout URL
 */
export function buildClickPaymentUrl(params: {
  serviceId?: string
  merchantId?: string
  amount: number
  studentId: string
  returnUrl?: string
}): string {
  const serviceId = params.serviceId || '32501'
  const merchantId = params.merchantId || '24560'
  const returnUrl = params.returnUrl || window.location.href
  return `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${params.amount}&transaction_param=${params.studentId}&return_url=${encodeURIComponent(returnUrl)}`
}

/**
 * Generate Payme checkout URL
 */
export function buildPaymePaymentUrl(params: {
  merchantId?: string
  amount: number // in som (Payme uses tiyin = 100x)
  studentId: string
}): string {
  const merchantId = params.merchantId || '65cf45a190b12a0000000000'
  const amountTiyin = params.amount * 100
  const paymeString = `m=${merchantId};ac.student_id=${params.studentId};a=${amountTiyin}`
  const base64Param = btoa(unescape(encodeURIComponent(paymeString)))
  return `https://checkout.paycom.uz/${base64Param}`
}

/**
 * Open external link using Telegram WebApp API if inside Telegram or standard browser redirect
 */
export function openExternalUrl(url: string) {
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
