// Supabase Edge Function: telegram-webhook
// Handles inbound Telegram updates:
// 1. /start [token]: links Telegram user by verification token
// 2. Contact message (message.contact): matches phone with parents.phone and verifies telegram_accounts
// 3. Interactive WebApp Mini App integration

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    chat: {
      id: number
      type: string
      first_name?: string
      last_name?: string
      username?: string
    }
    date: number
    text?: string
    contact?: {
      phone_number: string
      first_name: string
      last_name?: string
      user_id?: number
    }
  }
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  options?: {
    reply_markup?: any
    parse_mode?: string
  }
) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      reply_markup: options?.reply_markup,
    }),
  })
  return response.json()
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const parentPortalUrl = Deno.env.get('PARENT_PORTAL_URL') || 'https://edutrack.ilmziyo.uz/parent-portal'

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in telegram-webhook.')
    return new Response(JSON.stringify({ ok: false, error: 'Configuration Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payload: TelegramUpdate = await request.json().catch(() => null)
  if (!payload || !payload.message) {
    return new Response(JSON.stringify({ ok: true, note: 'Ignored non-message update' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const message = payload.message
  const chat = message.chat
  const fromUser = message.from
  const text = message.text?.trim()
  const contact = message.contact

  if (!fromUser || !chat) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Contact Message (message.contact)
    // -------------------------------------------------------------
    if (contact && contact.phone_number) {
      const rawPhone = contact.phone_number.trim()
      const digits = normalizePhoneDigits(rawPhone)
      const last9 = digits.slice(-9) // Last 9 digits for Uzbekistan phone matching

      // Search parents table by phone
      const { data: matchedParents, error: parentErr } = await supabase
        .from('parents')
        .select('id, organization_id, first_name, last_name, phone')
        .or(`phone.ilike.%${last9}%,phone.eq.${rawPhone},phone.eq.+${digits}`)
        .eq('is_deleted', false)
        .limit(1)

      if (parentErr) {
        console.error('Error querying parents by phone:', parentErr)
      }

      const parent = matchedParents && matchedParents.length > 0 ? matchedParents[0] : null

      if (parent) {
        // Upsert into telegram_accounts
        const { data: existingAccount } = await supabase
          .from('telegram_accounts')
          .select('id')
          .eq('parent_id', parent.id)
          .maybeSingle()

        if (existingAccount) {
          await supabase
            .from('telegram_accounts')
            .update({
              telegram_user_id: fromUser.id,
              telegram_username: fromUser.username || null,
              is_verified: true,
              phone_verified_at: new Date().toISOString(),
              notification_enabled: true,
            })
            .eq('id', existingAccount.id)
        } else {
          await supabase.from('telegram_accounts').insert({
            organization_id: parent.organization_id,
            parent_id: parent.id,
            telegram_user_id: fromUser.id,
            telegram_username: fromUser.username || null,
            is_verified: true,
            phone_verified_at: new Date().toISOString(),
            notification_enabled: true,
          })
        }

        // Also update parent record with telegram details
        await supabase
          .from('parents')
          .update({
            telegram_user_id: fromUser.id,
            telegram_username: fromUser.username || null,
            notification_enabled: true,
          })
          .eq('id', parent.id)

        // Congratulatory message with WebApp portal button
        const portalUrlWithUser = `${parentPortalUrl}?telegram_user_id=${fromUser.id}`

        if (telegramBotToken) {
          await sendTelegramMessage(
            telegramBotToken,
            chat.id,
            `🎉 <b>Tabriklaymiz, ${parent.first_name}!</b>\n\nSiz EduTrack Ilmziyo tizimida muvaffaqiyatli ro'yxatdan o'tdingiz. Endi farzandingizning davomati va baholari haqida shu bot orqali xabardor bo'lasiz.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "📲 Ota-onalar portali (Mini App)",
                      web_app: { url: portalUrlWithUser },
                    },
                  ],
                ],
              },
            }
          )
        }
      } else {
        // Not found in system
        if (telegramBotToken) {
          await sendTelegramMessage(
            telegramBotToken,
            chat.id,
            `⚠️ <b>Kechirasiz!</b>\n\nUshbu telefon raqam (<code>${rawPhone}</code>) EduTrack Ilmziyo tizimida ota-ona sifatida topilmadi.\n\nIltimos, o'quv markazi ma'muriyati bilan bog'lanib, telefon raqamingiz to'g'ri kiritilganini tekshiring.`,
            {
              reply_markup: {
                keyboard: [
                  [{ text: '📱 Qaytadan telefon raqam yuborish', request_contact: true }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            }
          )
        }
      }

      return new Response(JSON.stringify({ ok: true, action: 'contact_processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // SCENARIO 2: /start [token] Command
    // -------------------------------------------------------------
    if (text && text.startsWith('/start')) {
      const parts = text.split(' ')
      const token = parts.length > 1 ? parts[1].trim() : null

      if (token) {
        // Try to match verification token in telegram_accounts or pending links
        const { data: accounts } = await supabase
          .from('telegram_accounts')
          .select('id, parent_id, organization_id, verification_expires_at')
          .or(`verification_token_hash.eq.${token}`)
          .limit(1)

        const account = accounts && accounts.length > 0 ? accounts[0] : null

        if (account) {
          // Check expiration
          const isExpired =
            account.verification_expires_at &&
            new Date(account.verification_expires_at).getTime() < Date.now()

          if (!isExpired) {
            await supabase
              .from('telegram_accounts')
              .update({
                telegram_user_id: fromUser.id,
                telegram_username: fromUser.username || null,
                is_verified: true,
                phone_verified_at: new Date().toISOString(),
                notification_enabled: true,
                verification_token_hash: null,
              })
              .eq('id', account.id)

            // Also update parent record
            await supabase
              .from('parents')
              .update({
                telegram_user_id: fromUser.id,
                telegram_username: fromUser.username || null,
                notification_enabled: true,
              })
              .eq('id', account.parent_id)

            const portalUrlWithToken = `${parentPortalUrl}?token=${token}`

            if (telegramBotToken) {
              await sendTelegramMessage(
                telegramBotToken,
                chat.id,
                `🎉 <b>Tabriklaymiz!</b>\n\nSiz EduTrack Ilmziyo tizimida muvaffaqiyatli ro'yxatdan o'tdingiz. Endi farzandingizning davomati va baholari haqida shu bot orqali xabardor bo'lasiz.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📲 Ota-onalar portali (Mini App)",
                          web_app: { url: portalUrlWithToken },
                        },
                      ],
                    ],
                  },
                }
              )
            }

            return new Response(JSON.stringify({ ok: true, action: 'token_verified' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }
        }
      }

      // No token or token not matched: send welcome with Contact Request button
      if (telegramBotToken) {
        await sendTelegramMessage(
          telegramBotToken,
          chat.id,
          `Assalomu alaykum, hurmatli ota-ona!\n\nEduTrack Ilmziyo xabarnoma botiga xush kelibsiz.\n\nFarzandingizning darslarga qatnashishi, imtihon baholari va to'lovlarini kuzatib borish uchun, iltimos, pastdagi tugma orqali telefon raqamingizni tasdiqlang:`,
          {
            reply_markup: {
              keyboard: [
                [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        )
      }

      return new Response(JSON.stringify({ ok: true, action: 'welcome_sent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Other text messages
    // -------------------------------------------------------------
    if (telegramBotToken) {
      await sendTelegramMessage(
        telegramBotToken,
        chat.id,
        `Hurmatli ota-ona, tizimdan foydalanish uchun telefon raqamingizni yuboring yoki o'quv markazi ma'muriyatiga murojaat qiling.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🌐 Ota-onalar portali',
                  web_app: { url: `${parentPortalUrl}?telegram_user_id=${fromUser.id}` },
                },
              ],
            ],
          },
        }
      )
    }

    return new Response(JSON.stringify({ ok: true, action: 'fallback_handled' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Webhook processing exception:', error)
    return new Response(JSON.stringify({ ok: false, error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
