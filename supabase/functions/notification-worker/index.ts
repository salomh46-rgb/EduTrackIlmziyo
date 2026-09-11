// Supabase Edge Function: notification-worker
// Pulls pending notifications from notification_queue, formats messages, dispatches to Telegram Bot API, and logs outcomes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotificationQueueItem {
  id: string
  organization_id: string
  notification_type: string
  channel: string
  status: string
  payload: Record<string, any>
  recipient_parent_id?: string | null
  attempt_count?: number
  attempts?: number
  last_error?: string | null
  next_retry_at?: string | null
  scheduled_for?: string | null
  available_at?: string | null
}

interface TelegramAccountRecord {
  id: string
  parent_id: string
  telegram_user_id: number | string
  is_verified: boolean
  notification_enabled: boolean
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return String(amount || '0')
  return new Intl.NumberFormat('uz-UZ').format(num)
}

function buildNotificationMessage(type: string, payload: Record<string, any>): string {
  const studentName = payload.student_name || payload.studentName || 'O\'quvchi'
  const groupName = payload.group_name || payload.groupName || 'guruh'
  const lessonDate = payload.lesson_date || payload.lessonDate || new Date().toISOString().slice(0, 10)
  const amount = payload.amount ? formatCurrency(payload.amount) : '0'
  const receiptId = payload.receipt_id || payload.receiptId || `REC-${Date.now().toString().slice(-6)}`
  const subject = payload.subject || 'Fan'
  const score = payload.score ?? '0'
  const maxScore = payload.max_score ?? payload.maximum_score ?? '100'
  const grade = payload.grade || 'A'
  const dueDate = payload.due_date || payload.dueDate || ''

  // Custom explicit message in payload takes precedence if provided
  if (payload.message && typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message.trim()
  }

  switch (type) {
    case 'ATTENDANCE_ABSENT':
      return `⚠️ <b>Hurmatli ota-ona!</b>\nFarzandingiz <b>${studentName}</b> bugun <i>${groupName}</i> darsiga (${lessonDate}) qatnashmadi. Qo'shimcha ma'lumot uchun markaz ma'muriyati bilan bog'laning.`

    case 'PAYMENT_RECEIVED':
      return `✅ <b>To'lov qabul qilindi!</b>\nFarzandingiz <b>${studentName}</b> uchun <b>${amount}</b> so'm to'lov muvaffaqiyatli qabul qilindi.\nKvitansiya №: <code>${receiptId}</code>.`

    case 'EXAM_RESULT':
      return `🌟 <b>Imtihon natijasi!</b>\nFarzandingiz <b>${studentName}</b> ${subject} fanidan <b>${score}/${maxScore} (${grade})</b> ball to'pladi!`

    case 'PAYMENT_REMINDER':
      return `🔔 <b>To'lov eslatmasi!</b>\nFarzandingiz <b>${studentName}</b> uchun <b>${amount}</b> so'm to'lov muddati: <b>${dueDate || lessonDate}</b>.\nIltimos, o'z vaqtida to'lovni amalga oshirishingizni so'raymiz.`

    case 'ATTENDANCE_PRESENT':
      return `✅ <b>Darsga qatnashdi!</b>\nFarzandingiz <b>${studentName}</b> bugun <i>${groupName}</i> darsiga (${lessonDate}) o'z vaqtida qatnashdi.`

    case 'ATTENDANCE_LATE':
      return `⏰ <b>Darsga kechikish!</b>\nFarzandingiz <b>${studentName}</b> bugun <i>${groupName}</i> darsiga (${lessonDate}) kechikib keldi.`

    case 'ATTENDANCE_EXCUSED':
      return `ℹ️ <b>Sababli qatnashmadi:</b>\nFarzandingiz <b>${studentName}</b> bugun <i>${groupName}</i> darsiga (${lessonDate}) sababli qatnashmadi.`

    case 'HOMEWORK':
      return `📚 <b>Yangi uyga vazifa!</b>\nFarzandingiz <b>${studentName}</b> uchun ${subject} fanidan yangi vazifa yuklandi. Muddat: ${dueDate || 'keyingi darsgacha'}.`

    default:
      return `📢 <b>EduTrack Ilmziyo xabarnomasi:</b>\nFarzandingiz <b>${studentName}</b> haqida yangi ma'lumot mavjud.`
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  try {
    const nowIso = new Date().toISOString()

    // 1. Pull up to 20 PENDING items where scheduled time has arrived
    const { data: queueItems, error: queueError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'PENDING')
      .or(`available_at.is.null,available_at.lte.${nowIso}`)
      .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
      .order('created_at', { ascending: true })
      .limit(20)

    if (queueError) {
      console.error('Failed to fetch notification_queue:', queueError)
      return new Response(
        JSON.stringify({ ok: false, error: queueError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'No pending notifications in queue.',
          processed: 0,
          sent: 0,
          failed: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let sentCount = 0
    let failedCount = 0
    const results = []

    for (const item of queueItems as NotificationQueueItem[]) {
      const attempts = (item.attempts ?? item.attempt_count ?? 0) + 1
      const parentId = item.recipient_parent_id || item.payload?.parent_id || item.payload?.parentId
      let telegramAccountId: string | null = null
      let telegramUserId: string | number | null = null

      try {
        if (!parentId) {
          throw new Error('Missing recipient parent_id in notification record.')
        }

        // 2. Resolve Telegram User ID from telegram_accounts
        const { data: tgAccount, error: tgError } = await supabase
          .from('telegram_accounts')
          .select('id, parent_id, telegram_user_id, is_verified, notification_enabled')
          .eq('parent_id', parentId)
          .maybeSingle()

        if (tgError) {
          console.warn(`Error resolving telegram_accounts for parent ${parentId}:`, tgError)
        }

        if (tgAccount && tgAccount.telegram_user_id) {
          if (!tgAccount.notification_enabled) {
            throw new Error('Parent has disabled Telegram notifications.')
          }
          telegramAccountId = tgAccount.id
          telegramUserId = tgAccount.telegram_user_id
        } else {
          // Fallback: check parents table directly
          const { data: parentRecord } = await supabase
            .from('parents')
            .select('id, telegram_user_id, notification_enabled')
            .eq('id', parentId)
            .maybeSingle()

          if (parentRecord?.telegram_user_id) {
            if (parentRecord.notification_enabled === false) {
              throw new Error('Parent has disabled Telegram notifications.')
            }
            telegramUserId = parentRecord.telegram_user_id
          } else {
            throw new Error(`Parent ${parentId} has no linked or verified Telegram account.`)
          }
        }

        // 3. Format message based on notification_type
        const messageText = buildNotificationMessage(item.notification_type, item.payload || {})

        // 4. Dispatch message to Telegram Bot API
        if (!telegramBotToken) {
          throw new Error('TELEGRAM_BOT_TOKEN environment variable is not configured.')
        }

        const tgResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramUserId,
            text: messageText,
            parse_mode: 'HTML',
          }),
        })

        const tgResult = await tgResponse.json()

        if (!tgResponse.ok || !tgResult.ok) {
          const errDetail = tgResult.description || `HTTP ${tgResponse.status}`
          throw new Error(`Telegram API rejected: ${errDetail}`)
        }

        // 5. Success: update queue and insert log
        const providerMessageId = tgResult.result?.message_id ? String(tgResult.result.message_id) : null

        await supabase
          .from('notification_queue')
          .update({
            status: 'SENT',
            attempts: attempts,
            attempt_count: attempts,
            sent_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', item.id)

        await supabase.from('notification_logs').insert({
          queue_id: item.id,
          organization_id: item.organization_id,
          telegram_account_id: telegramAccountId,
          status: 'SENT',
          provider_message_id: providerMessageId,
          sent_at: new Date().toISOString(),
        })

        sentCount++
        results.push({ id: item.id, status: 'SENT', provider_message_id: providerMessageId })
      } catch (err: any) {
        const errorMsg = err?.message || 'Unknown notification dispatch error'
        console.error(`Failed processing notification ${item.id}:`, errorMsg)

        const isMaxRetries = attempts >= 5
        const backoffMinutes = Math.min(60, Math.pow(2, attempts))
        const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()

        await supabase
          .from('notification_queue')
          .update({
            status: isMaxRetries ? 'FAILED' : 'PENDING',
            attempts: attempts,
            attempt_count: attempts,
            last_error: errorMsg,
            next_retry_at: isMaxRetries ? null : nextRetry,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id)

        await supabase.from('notification_logs').insert({
          queue_id: item.id,
          organization_id: item.organization_id,
          telegram_account_id: telegramAccountId,
          status: 'FAILED',
          error_message: errorMsg,
        })

        failedCount++
        results.push({ id: item.id, status: 'FAILED', error: errorMsg, attempts })
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: queueItems.length,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (globalErr: any) {
    console.error('Unhandled worker exception:', globalErr)
    return new Response(
      JSON.stringify({ ok: false, error: globalErr?.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
