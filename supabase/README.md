# Supabase Architecture

This folder contains the PostgreSQL migration history and edge function entry points for EduTrackIlmziyo.

Planned structure:

- `migrations/` for SQL schema and RLS changes
- `functions/telegram-webhook/` for Telegram bot updates
- `functions/notification-worker/` for asynchronous notification processing

Secrets such as the Telegram bot token and Supabase service role key must remain server-side only.

