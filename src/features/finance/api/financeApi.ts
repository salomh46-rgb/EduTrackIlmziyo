import { supabase } from '@/lib/supabase/client'
import { recordAuditEvent } from '@/features/shared/api/audit'
import { toTiyin } from '@/features/finance/services/paymentGateways'
import type {
  DebtSummary,
  FinanceStats,
  PaymentFilter,
  PaymentRecord,
  PaymentStatus,
  PaymentUpsertInput,
} from '@/features/finance/types'

type RawPaymentRow = {
  id: string
  organization_id: string
  student_id: string
  amount: number | string
  payment_date: string | null
  due_date: string | null
  status: PaymentStatus
  method: string | null
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  students?: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    group_students?: Array<{
      id: string
      status: string
      groups?: {
        id: string
        name: string
        subject: string
      } | null
    }>
  } | null
}

function mapPaymentRecord(row: RawPaymentRow): PaymentRecord {
  const amount = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0
  const activeGroupStudent =
    row.students?.group_students?.find((item) => item.status === 'ACTIVE') ??
    row.students?.group_students?.[0]
  const group = activeGroupStudent?.groups

  return {
    id: row.id,
    organization_id: row.organization_id,
    student_id: row.student_id,
    amount,
    amount_in_tiyin: toTiyin(amount),
    payment_date: row.payment_date,
    due_date: row.due_date,
    status: row.status,
    method: row.method ?? 'CASH',
    note: row.note,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    receipt_number: `KV-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    transaction_id: `TX-${row.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`,
    student: row.students
      ? {
          id: row.students.id,
          first_name: row.students.first_name,
          last_name: row.students.last_name,
          phone: row.students.phone,
          group_name: group?.name ?? null,
          group_subject: group?.subject ?? null,
        }
      : null,
  }
}

/**
 * List payments for an organization with filtering, pagination and search
 */
export async function listPayments(
  orgId: string,
  filter?: PaymentFilter,
): Promise<{ rows: PaymentRecord[]; totalCount: number }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const page = filter?.page ?? 0
  const pageSize = filter?.pageSize ?? 15
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('payments')
    .select(
      `
      id,
      organization_id,
      student_id,
      amount,
      payment_date,
      due_date,
      status,
      method,
      note,
      created_by,
      created_at,
      updated_at,
      students (
        id,
        first_name,
        last_name,
        phone,
        group_students (
          id,
          status,
          groups (
            id,
            name,
            subject
          )
        )
      )
    `,
      { count: 'exact' },
    )
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (filter?.status && filter.status !== 'ALL') {
    query = query.eq('status', filter.status)
  }

  if (filter?.method && filter.method !== 'ALL') {
    query = query.eq('method', filter.method)
  }

  if (filter?.startDate) {
    query = query.gte('payment_date', filter.startDate)
  }

  if (filter?.endDate) {
    query = query.lte('payment_date', filter.endDate)
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    throw error
  }

  let mappedRows = ((data as unknown as RawPaymentRow[]) ?? []).map(mapPaymentRecord)

  if (filter?.search && filter.search.trim()) {
    const s = filter.search.trim().toLowerCase()
    mappedRows = mappedRows.filter((item) => {
      const studentName = item.student
        ? `${item.student.first_name} ${item.student.last_name}`.toLowerCase()
        : ''
      const phone = item.student?.phone?.toLowerCase() ?? ''
      const note = item.note?.toLowerCase() ?? ''
      const receipt = item.receipt_number.toLowerCase()
      const tx = item.transaction_id.toLowerCase()
      return (
        studentName.includes(s) ||
        phone.includes(s) ||
        note.includes(s) ||
        receipt.includes(s) ||
        tx.includes(s)
      )
    })
  }

  return {
    rows: mappedRows,
    totalCount: count ?? mappedRows.length,
  }
}

/**
 * Record a new payment and enqueue notification if PAID
 */
export async function createPayment(
  orgId: string,
  input: PaymentUpsertInput,
  actorProfileId?: string,
): Promise<PaymentRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const today = new Date().toISOString().split('T')[0]
  const paymentDate = input.payment_date || today

  // 1. Insert payment record
  const { data, error } = await supabase
    .from('payments')
    .insert({
      organization_id: orgId,
      student_id: input.student_id,
      amount: input.amount,
      payment_date: paymentDate,
      due_date: input.due_date || null,
      status: input.status,
      method: input.method,
      note: input.note || null,
      created_by: actorProfileId || null,
    })
    .select(
      `
      id,
      organization_id,
      student_id,
      amount,
      payment_date,
      due_date,
      status,
      method,
      note,
      created_by,
      created_at,
      updated_at,
      students (
        id,
        first_name,
        last_name,
        phone,
        group_students (
          id,
          status,
          groups (
            id,
            name,
            subject
          )
        )
      )
    `,
    )
    .single()

  if (error) {
    throw error
  }

  const created = mapPaymentRecord(data as unknown as RawPaymentRow)

  // 2. If PAID, enqueue notification into notification_queue
  if (input.status === 'PAID') {
    try {
      // Find parent to notify
      const { data: parentLink } = await supabase
        .from('parent_students')
        .select('parent_id, is_primary')
        .eq('student_id', input.student_id)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle()

      const recipientParentId = parentLink?.parent_id ?? null
      const studentName = created.student
        ? `${created.student.first_name} ${created.student.last_name}`
        : "O'quvchi"

      const notificationPayload = {
        event: 'PAYMENT_RECEIVED',
        payment_id: created.id,
        student_id: created.student_id,
        student_name: studentName,
        amount: created.amount,
        amount_formatted: `${new Intl.NumberFormat('uz-UZ').format(created.amount)} so'm`,
        payment_date: created.payment_date,
        method: created.method,
        receipt_number: created.receipt_number,
        transaction_id: created.transaction_id,
      }

      // Try inserting with 'PAYMENT_RECEIVED', fallback to 'PAYMENT_REMINDER'
      const { error: notifError } = await supabase.from('notification_queue').insert({
        organization_id: orgId,
        notification_type: 'PAYMENT_RECEIVED' as unknown as 'PAYMENT_REMINDER',
        channel: 'telegram',
        status: 'PENDING',
        recipient_parent_id: recipientParentId,
        payload: notificationPayload,
      })

      if (notifError) {
        // Fallback for strict enum compatibility
        await supabase.from('notification_queue').insert({
          organization_id: orgId,
          notification_type: 'PAYMENT_REMINDER',
          channel: 'telegram',
          status: 'PENDING',
          recipient_parent_id: recipientParentId,
          payload: notificationPayload,
        })
      }
    } catch (err) {
      console.warn('Payment notification queue dispatch warning:', err)
    }
  }

  // 3. Record audit event
  if (actorProfileId) {
    void recordAuditEvent({
      organizationId: orgId,
      actorProfileId,
      action: 'PAYMENT_CREATED',
      entityType: 'payment',
      entityId: created.id,
      metadata: {
        amount: input.amount,
        method: input.method,
        status: input.status,
        student_id: input.student_id,
      },
    })
  }

  return created
}

/**
 * Calculate financial overview and statistics for dashboard & payments analytics
 */
export async function getFinanceOverview(orgId: string): Promise<FinanceStats> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, method, payment_date, due_date')
    .eq('organization_id', orgId)

  if (error) {
    throw error
  }

  const payments = (data ?? []).map((row) => ({
    ...row,
    amount: typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0,
  }))

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  let totalCollectedMonth = 0
  let pendingAmount = 0
  const methodMap: Record<string, number> = {}

  // Last 6 months buckets
  const trendMap = new Map<string, { label: string; amount: number; count: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('uz-UZ', { month: 'short', year: 'numeric' })
    trendMap.set(key, { label, amount: 0, count: 0 })
  }

  const overdueSet = new Set<string>()

  for (const p of payments) {
    const pDate = p.payment_date ? new Date(p.payment_date) : null
    const isThisMonth =
      pDate && pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth

    if (p.status === 'PAID') {
      if (isThisMonth) {
        totalCollectedMonth += p.amount
      }

      // Method distribution
      const m = p.method ?? 'CASH'
      methodMap[m] = (methodMap[m] ?? 0) + p.amount

      // Trend accumulation
      if (pDate) {
        const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
        const entry = trendMap.get(key)
        if (entry) {
          entry.amount += p.amount
          entry.count += 1
        }
      }
    } else if (p.status === 'PENDING' || p.status === 'OVERDUE') {
      pendingAmount += p.amount
      overdueSet.add(p.id)
    }
  }

  return {
    total_collected_month: totalCollectedMonth,
    pending_amount: pendingAmount,
    overdue_debtors_count: overdueSet.size,
    total_transactions_count: payments.length,
    payment_methods_breakdown: methodMap,
    monthly_trend: Array.from(trendMap.values()).map((item) => ({
      month: item.label,
      amount: item.amount,
      count: item.count,
    })),
  }
}

/**
 * List students with pending/overdue debt
 */
export async function listDebtors(orgId: string): Promise<DebtSummary[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  // Fetch payments that are not PAID or REFUNDED
  const { data, error } = await supabase
    .from('payments')
    .select(
      `
      id,
      amount,
      status,
      payment_date,
      due_date,
      student_id,
      students (
        id,
        first_name,
        last_name,
        phone,
        group_students (
          id,
          status,
          groups (
            id,
            name
          )
        )
      )
    `,
    )
    .eq('organization_id', orgId)
    .in('status', ['PENDING', 'OVERDUE', 'PARTIAL'])

  if (error) {
    throw error
  }

  const today = new Date()
  const debtorMap = new Map<string, DebtSummary>()

  for (const row of (data as unknown as RawPaymentRow[]) ?? []) {
    if (!row.students) continue

    const studentId = row.students.id
    const studentName = `${row.students.first_name} ${row.students.last_name}`.trim()
    const amount = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0
    const activeGroup =
      row.students.group_students?.find((g) => g.status === 'ACTIVE')?.groups?.name ??
      row.students.group_students?.[0]?.groups?.name ??
      null

    let daysOverdue = 0
    if (row.due_date) {
      const dueDate = new Date(row.due_date)
      if (dueDate < today) {
        daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)))
      }
    }

    const isOverdue = row.status === 'OVERDUE' || daysOverdue > 0

    if (!debtorMap.has(studentId)) {
      debtorMap.set(studentId, {
        student_id: studentId,
        student_name: studentName,
        phone: row.students.phone,
        group_name: activeGroup,
        pending_amount: isOverdue ? 0 : amount,
        overdue_amount: isOverdue ? amount : 0,
        total_debt: amount,
        last_payment_date: row.payment_date,
        days_overdue: daysOverdue,
        status: isOverdue ? 'OVERDUE' : 'PENDING',
      })
    } else {
      const existing = debtorMap.get(studentId)!
      existing.total_debt += amount
      if (isOverdue) {
        existing.overdue_amount += amount
        existing.days_overdue = Math.max(existing.days_overdue, daysOverdue)
        existing.status = 'OVERDUE'
      } else {
        existing.pending_amount += amount
      }
    }
  }

  return Array.from(debtorMap.values()).sort((a, b) => b.total_debt - a.total_debt)
}

/**
 * Helper to fetch students list for creating payments
 */
export async function listStudentsForPayment(
  orgId: string,
): Promise<Array<{ id: string; name: string; phone: string | null; group_name: string | null }>> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('students')
    .select(
      `
      id,
      first_name,
      last_name,
      phone,
      group_students (
        status,
        groups (
          name
        )
      )
    `,
    )
    .eq('organization_id', orgId)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((item) => {
    const groupEntry =
      item.group_students?.find((g) => g.status === 'ACTIVE') ?? item.group_students?.[0]
    const rawGroup = groupEntry?.groups as unknown
    const activeGroup = Array.isArray(rawGroup)
      ? (rawGroup[0] as { name?: string } | undefined)?.name ?? null
      : (rawGroup as { name?: string } | undefined)?.name ?? null

    return {
      id: item.id,
      name: `${item.first_name} ${item.last_name}`.trim(),
      phone: item.phone,
      group_name: activeGroup,
    }
  })
}
