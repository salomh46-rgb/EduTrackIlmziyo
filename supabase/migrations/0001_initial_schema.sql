create extension if not exists pgcrypto;

do $$
begin
  create type public.organization_role as enum ('OWNER', 'ADMIN', 'TEACHER', 'PARENT', 'STUDENT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('ACTIVE', 'INVITED', 'SUSPENDED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.student_status as enum ('ACTIVE', 'INACTIVE', 'FROZEN', 'GRADUATED', 'LEFT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.teacher_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.group_status as enum ('ACTIVE', 'PAUSED', 'ARCHIVED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.attendance_status as enum ('PRESENT', 'LATE', 'EXCUSED', 'ABSENT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('PAID', 'PENDING', 'OVERDUE', 'PARTIAL');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum (
    'ATTENDANCE_PRESENT',
    'ATTENDANCE_LATE',
    'ATTENDANCE_EXCUSED',
    'ATTENDANCE_ABSENT',
    'HOMEWORK',
    'EXAM_RESULT',
    'PAYMENT_REMINDER',
    'ANNOUNCEMENT'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  locale text not null default 'en',
  timezone text not null default 'Asia/Tashkent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Tashkent',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null default 'TEACHER',
  status public.member_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  avatar_url text,
  specialization text,
  status public.teacher_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  telegram_user_id bigint unique,
  telegram_username text,
  notification_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  phone text,
  birth_date date,
  gender text,
  status public.student_status not null default 'ACTIVE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relation_type text not null default 'guardian',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  subject text not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  room text,
  schedule jsonb not null default '{}'::jsonb,
  capacity integer not null default 0 check (capacity >= 0),
  status public.group_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, student_id)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  topic text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'SCHEDULED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  lesson_date date not null,
  status public.attendance_status not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  description text not null default '',
  deadline timestamptz,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  submitted_at timestamptz,
  note text,
  attachment_url text,
  status text not null default 'SUBMITTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  subject text not null,
  exam_date date not null,
  maximum_score numeric(8,2) not null check (maximum_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(8,2) not null check (score >= 0),
  percentage numeric(5,2) not null check (percentage >= 0 and percentage <= 100),
  grade text,
  teacher_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  payment_date date,
  due_date date,
  status public.payment_status not null default 'PENDING',
  method text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  telegram_user_id bigint not null unique,
  telegram_username text,
  phone_verified_at timestamptz,
  notification_enabled boolean not null default true,
  verification_token_hash text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id)
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.notification_type not null,
  code text not null,
  title text not null,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notification_type public.notification_type not null,
  channel text not null default 'telegram',
  status public.notification_status not null default 'PENDING',
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.notification_queue(id) on delete cascade,
  telegram_account_id uuid references public.telegram_accounts(id) on delete set null,
  status public.notification_status not null,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_members_org_idx on public.organization_members (organization_id);
create index if not exists organization_members_profile_idx on public.organization_members (profile_id);
create index if not exists teachers_org_idx on public.teachers (organization_id);
create index if not exists parents_org_idx on public.parents (organization_id);
create index if not exists students_org_idx on public.students (organization_id);
create index if not exists groups_org_idx on public.groups (organization_id);
create index if not exists lessons_group_idx on public.lessons (group_id);
create index if not exists attendance_lesson_idx on public.attendance (lesson_id);
create index if not exists attendance_student_idx on public.attendance (student_id);
create index if not exists payments_student_idx on public.payments (student_id);
create index if not exists queue_status_idx on public.notification_queue (status, scheduled_for);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'organizations',
    'organization_members',
    'teachers',
    'parents',
    'students',
    'parent_students',
    'groups',
    'group_students',
    'lessons',
    'attendance',
    'homework',
    'homework_submissions',
    'exams',
    'exam_results',
    'payments',
    'telegram_accounts',
    'notification_templates',
    'notification_queue',
    'notification_logs',
    'settings',
    'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.profile_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles public.organization_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.profile_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role = any(allowed_roles)
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "organizations_select_members" on public.organizations;
create policy "organizations_select_members"
on public.organizations
for select
using (public.is_org_member(id));

drop policy if exists "organization_members_select_members" on public.organization_members;
create policy "organization_members_select_members"
on public.organization_members
for select
using (public.is_org_member(organization_id));

drop policy if exists "organization_members_manage_admins" on public.organization_members;
create policy "organization_members_manage_admins"
on public.organization_members
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_org_tables" on public.teachers;
create policy "staff_read_org_tables"
on public.teachers
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_teachers" on public.teachers;
create policy "staff_write_teachers"
on public.teachers
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_parents" on public.parents;
create policy "staff_read_parents"
on public.parents
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_parents" on public.parents;
create policy "staff_write_parents"
on public.parents
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_students" on public.students;
create policy "staff_read_students"
on public.students
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_students" on public.students;
create policy "staff_write_students"
on public.students
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]));

drop policy if exists "staff_read_groups" on public.groups;
create policy "staff_read_groups"
on public.groups
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_groups" on public.groups;
create policy "staff_write_groups"
on public.groups
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_lessons" on public.lessons;
create policy "staff_read_lessons"
on public.lessons
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_lessons" on public.lessons;
create policy "staff_write_lessons"
on public.lessons
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]));

drop policy if exists "staff_read_attendance" on public.attendance;
create policy "staff_read_attendance"
on public.attendance
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_attendance" on public.attendance;
create policy "staff_write_attendance"
on public.attendance
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]));

drop policy if exists "staff_read_homework" on public.homework;
create policy "staff_read_homework"
on public.homework
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_homework" on public.homework;
create policy "staff_write_homework"
on public.homework
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]));

drop policy if exists "staff_read_exams" on public.exams;
create policy "staff_read_exams"
on public.exams
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_exams" on public.exams;
create policy "staff_write_exams"
on public.exams
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]));

drop policy if exists "staff_read_results" on public.exam_results;
create policy "staff_read_results"
on public.exam_results
for select
using (
  exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and public.is_org_member(e.organization_id)
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
      and public.has_org_role(e.organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[])
  )
)
with check (
  exists (
    select 1
    from public.exams e
    where e.id = exam_id
      and public.has_org_role(e.organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[])
  )
);

drop policy if exists "staff_read_payments" on public.payments;
create policy "staff_read_payments"
on public.payments
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_payments" on public.payments;
create policy "staff_write_payments"
on public.payments
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_notifications" on public.notification_queue;
create policy "staff_read_notifications"
on public.notification_queue
for select
using (public.is_org_member(organization_id));

drop policy if exists "staff_write_notifications" on public.notification_queue;
create policy "staff_write_notifications"
on public.notification_queue
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN', 'TEACHER']::public.organization_role[]));

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_members_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

create trigger teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

create trigger parents_updated_at
before update on public.parents
for each row execute function public.set_updated_at();

create trigger students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger parent_students_updated_at
before update on public.parent_students
for each row execute function public.set_updated_at();

create trigger groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger group_students_updated_at
before update on public.group_students
for each row execute function public.set_updated_at();

create trigger lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create trigger attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

create trigger homework_updated_at
before update on public.homework
for each row execute function public.set_updated_at();

create trigger homework_submissions_updated_at
before update on public.homework_submissions
for each row execute function public.set_updated_at();

create trigger exams_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

create trigger exam_results_updated_at
before update on public.exam_results
for each row execute function public.set_updated_at();

create trigger payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger telegram_accounts_updated_at
before update on public.telegram_accounts
for each row execute function public.set_updated_at();

create trigger notification_templates_updated_at
before update on public.notification_templates
for each row execute function public.set_updated_at();

create trigger notification_queue_updated_at
before update on public.notification_queue
for each row execute function public.set_updated_at();

create trigger settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

