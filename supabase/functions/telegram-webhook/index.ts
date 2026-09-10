// Telegram webhook scaffold for EduTrackIlmziyo.
// This will later validate inbound Telegram updates and enqueue parent verification or bot actions.

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const payload = await request.json().catch(() => null)

  if (!payload) {
    return new Response('Invalid payload', { status: 400 })
  }

  return Response.json({
    ok: true,
    message: 'Telegram webhook scaffold received a payload.',
  })
})

