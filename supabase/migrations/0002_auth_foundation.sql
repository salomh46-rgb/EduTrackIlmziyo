alter table public.profiles
  add column if not exists role public.organization_role not null default 'TEACHER';

create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.current_app_role()
returns public.organization_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.has_app_role(allowed_roles public.organization_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = any(allowed_roles)
  );
$$;

create or replace function public.is_profile_owner(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid();
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.organization_role;
begin
  requested_role :=
    case
      when new.raw_user_meta_data ? 'role'
        and (new.raw_user_meta_data->>'role') in ('OWNER', 'ADMIN', 'TEACHER')
      then (new.raw_user_meta_data->>'role')::public.organization_role
      else 'TEACHER'::public.organization_role
    end;

  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    requested_role
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (public.is_profile_owner(id));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (public.is_profile_owner(id))
with check (public.is_profile_owner(id));

drop policy if exists "organization_members_select_members" on public.organization_members;
create policy "organization_members_select_members"
on public.organization_members
for select
using (
  public.is_profile_owner(profile_id)
  or public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[])
);

drop policy if exists "organization_members_manage_admins" on public.organization_members;
create policy "organization_members_manage_admins"
on public.organization_members
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_org_tables" on public.teachers;
create policy "staff_read_org_tables"
on public.teachers
for select
using (
  public.is_profile_owner(profile_id)
  or public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[])
);

drop policy if exists "staff_write_teachers" on public.teachers;
create policy "staff_write_teachers"
on public.teachers
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_parents" on public.parents;
create policy "staff_read_parents"
on public.parents
for select
using (
  public.is_profile_owner(profile_id)
  or public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[])
);

drop policy if exists "staff_write_parents" on public.parents;
create policy "staff_write_parents"
on public.parents
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_students" on public.students;
create policy "staff_read_students"
on public.students
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_students" on public.students;
create policy "staff_write_students"
on public.students
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_groups" on public.groups;
create policy "staff_read_groups"
on public.groups
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_groups" on public.groups;
create policy "staff_write_groups"
on public.groups
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_lessons" on public.lessons;
create policy "staff_read_lessons"
on public.lessons
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_lessons" on public.lessons;
create policy "staff_write_lessons"
on public.lessons
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_attendance" on public.attendance;
create policy "staff_read_attendance"
on public.attendance
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_attendance" on public.attendance;
create policy "staff_write_attendance"
on public.attendance
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_homework" on public.homework;
create policy "staff_read_homework"
on public.homework
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_homework" on public.homework;
create policy "staff_write_homework"
on public.homework
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_exams" on public.exams;
create policy "staff_read_exams"
on public.exams
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_exams" on public.exams;
create policy "staff_write_exams"
on public.exams
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_results" on public.exam_results;
create policy "staff_read_results"
on public.exam_results
for select
using (
  exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[])
  )
);

drop policy if exists "staff_write_results" on public.exam_results;
create policy "staff_write_results"
on public.exam_results
for all
using (
  exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[])
  )
)
with check (
  exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[])
  )
);

drop policy if exists "staff_read_payments" on public.payments;
create policy "staff_read_payments"
on public.payments
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_payments" on public.payments;
create policy "staff_write_payments"
on public.payments
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_notifications" on public.notification_queue;
create policy "staff_read_notifications"
on public.notification_queue
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_notifications" on public.notification_queue;
create policy "staff_write_notifications"
on public.notification_queue
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "settings_manage_admins" on public.settings;
create policy "settings_manage_admins"
on public.settings
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "audit_logs_read_admins" on public.audit_logs;
create policy "audit_logs_read_admins"
on public.audit_logs
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "audit_logs_manage_admins" on public.audit_logs;
create policy "audit_logs_manage_admins"
on public.audit_logs
for insert
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "telegram_accounts_manage_admins" on public.telegram_accounts;
create policy "telegram_accounts_manage_admins"
on public.telegram_accounts
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "parent_students_manage_admins" on public.parent_students;
create policy "parent_students_manage_admins"
on public.parent_students
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "group_students_manage_admins" on public.group_students;
create policy "group_students_manage_admins"
on public.group_students
for all
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "notification_logs_read_admins" on public.notification_logs;
create policy "notification_logs_read_admins"
on public.notification_logs
for select
using (public.has_app_role(array['OWNER', 'ADMIN']::public.organization_role[]));

