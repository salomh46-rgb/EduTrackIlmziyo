-- Phase 3: Fintech & Payments Engine Migration
-- Adds PAYMENT_RECEIVED to notification_type enum and FAILED, REFUNDED to payment_status enum

do $$
begin
  alter type public.notification_type add value if not exists 'PAYMENT_RECEIVED';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter type public.payment_status add value if not exists 'FAILED';
  alter type public.payment_status add value if not exists 'REFUNDED';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
