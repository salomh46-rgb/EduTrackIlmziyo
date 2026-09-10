-- Phase 3 RLS verification queries
-- These are documentation-first checks. Run them only against a seeded Supabase project.

-- 1. User from Organization A cannot read Organization B
-- select * from public.students where organization_id = '<org_b_uuid>';

-- 2. Teacher cannot access unrelated organization's students
-- select * from public.students where organization_id = '<other_org_uuid>';

-- 3. Teacher cannot modify payments unless explicitly authorized
-- update public.payments set amount = amount + 1 where organization_id = '<org_uuid>';

-- 4. Admin cannot access another organization's data
-- select * from public.groups where organization_id = '<other_org_uuid>';

-- 5. Owner can access organization data
-- select * from public.students where organization_id = '<owner_org_uuid>';

-- 6. Duplicate attendance cannot be inserted
-- insert into public.attendance (organization_id, student_id, group_id, lesson_id, lesson_date, status)
-- values ('<org_uuid>', '<student_uuid>', '<group_uuid>', '<lesson_uuid>', current_date, 'PRESENT');
-- repeat the same insert and expect a unique violation on (student_id, lesson_id)

-- 7. Duplicate Telegram account link cannot be created
-- insert into public.telegram_accounts (organization_id, parent_id, telegram_user_id)
-- values ('<org_uuid>', '<parent_uuid>', 123456789);
-- repeat the same insert and expect a unique violation on parent_id or telegram_user_id

