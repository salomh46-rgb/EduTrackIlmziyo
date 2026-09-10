// Notification worker scaffold for EduTrackIlmziyo.
// The production version will pull queued messages, send Telegram notifications, and log outcomes.

Deno.serve(() => {
  return Response.json({
    ok: true,
    message: 'Notification worker scaffold is alive.',
  })
})

