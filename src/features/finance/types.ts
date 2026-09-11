export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'OVERDUE' | 'PARTIAL'

export type PaymentMethod = 'CLICK' | 'PAYME' | 'UZUM' | 'CASH' | 'BANK_TRANSFER'

export type PaymentRecord = {
  id: string
  organization_id: string
  student_id: string
  amount: number // in Uzbek So'm
  amount_in_tiyin: number // Jasper Pillar 4: amount * 100
  payment_date: string | null
  due_date: string | null
  status: PaymentStatus
  method: PaymentMethod | string
  note: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  receipt_number: string
  transaction_id: string
  student?: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
    group_name?: string | null
    group_subject?: string | null
  } | null
}

export type PaymentUpsertInput = {
  student_id: string
  amount: number // in Uzbek So'm
  payment_date?: string
  due_date?: string
  status: PaymentStatus
  method: PaymentMethod
  note?: string
}

export type DebtSummary = {
  student_id: string
  student_name: string
  phone: string | null
  group_name: string | null
  pending_amount: number
  overdue_amount: number
  total_debt: number
  last_payment_date: string | null
  days_overdue: number
  status: 'OVERDUE' | 'PENDING'
}

export type FinanceStats = {
  total_collected_month: number
  pending_amount: number
  overdue_debtors_count: number
  total_transactions_count: number
  payment_methods_breakdown: Record<string, number>
  monthly_trend: Array<{ month: string; amount: number; count: number }>
}

export type PaymentFilter = {
  status?: PaymentStatus | 'ALL'
  method?: PaymentMethod | 'ALL'
  search?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}
