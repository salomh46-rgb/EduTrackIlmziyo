do $$
begin
  create type public.lesson_status as enum ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.group_membership_status as enum ('ACTIVE', 'LEFT');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.student_relationship_type as enum ('MOTHER', 'FATHER', 'GUARDIAN', 'OTHER');
exception
  when duplicate_object then null;
end $$;

alter table public.organizations
  add column if not exists logo_url text,
  add column if not exists status text not null default 'ACTIVE';

alter table public.organization_members
  add column if not exists user_id uuid;

update public.organization_members
set user_id = profile_id
where user_id is null;

alter table public.organization_members
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_user_id_fkey'
  ) then
    alter table public.organization_members
      add constraint organization_members_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

alter table public.parent_students
  add column if not exists organization_id uuid;

alter table public.parent_students
  alter column relation_type drop default;

alter table public.parent_students
  alter column relation_type type public.student_relationship_type using upper(coalesce(relation_type, 'GUARDIAN'))::public.student_relationship_type;

alter table public.parent_students
  alter column relation_type set default 'GUARDIAN'::public.student_relationship_type;

update public.parent_students ps
set organization_id = p.organization_id
from public.parents p
where ps.parent_id = p.id
  and ps.organization_id is null;

alter table public.parent_students
  alter column organization_id set not null;

alter table public.group_students
  add column if not exists organization_id uuid,
  add column if not exists status public.group_membership_status not null default 'ACTIVE';

update public.group_students gs
set organization_id = g.organization_id
from public.groups g
where gs.group_id = g.id
  and gs.organization_id is null;

alter table public.group_students
  alter column organization_id set not null;

alter table public.lessons
  add column if not exists subject text,
  add column if not exists room text,
  add column if not exists notes text not null default '',
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

update public.lessons
set subject = coalesce(subject, title)
where subject is null or subject = '';

alter table public.lessons
  alter column subject set not null;

alter table public.lessons
  alter column status drop default;

alter table public.lessons
  alter column status type public.lesson_status using upper(status)::public.lesson_status;

alter table public.lessons
  alter column status set default 'SCHEDULED'::public.lesson_status;

alter table public.lessons
  add constraint lessons_end_after_start check (ends_at is null or ends_at > starts_at);

alter table public.students
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.parents
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.teachers
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.groups
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.telegram_accounts
  add column if not exists is_verified boolean not null default false;

update public.telegram_accounts
set is_verified = phone_verified_at is not null
where is_verified = false and phone_verified_at is not null;

alter table public.notification_queue
  add column if not exists recipient_parent_id uuid references public.parents(id) on delete set null,
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists attempts integer not null default 0,
  add column if not exists sent_at timestamptz;

update public.notification_queue
set attempts = coalesce(attempt_count, 0)
where attempts = 0 and attempt_count is not null;

alter table public.homework_submissions
  add column if not exists organization_id uuid;

update public.homework_submissions hs
set organization_id = h.organization_id
from public.homework h
where hs.homework_id = h.id
  and hs.organization_id is null;

alter table public.homework_submissions
  alter column organization_id set not null;

alter table public.exam_results
  add column if not exists organization_id uuid;

update public.exam_results er
set organization_id = e.organization_id
from public.exams e
where er.exam_id = e.id
  and er.organization_id is null;

alter table public.exam_results
  alter column organization_id set not null;

alter table public.notification_logs
  add column if not exists organization_id uuid;

update public.notification_logs nl
set organization_id = q.organization_id
from public.notification_queue q
where nl.queue_id = q.id
  and nl.organization_id is null;

alter table public.notification_logs
  alter column organization_id set not null;

alter table public.audit_logs
  add column if not exists actor_user_id uuid references public.profiles(id) on delete set null;

update public.audit_logs
set actor_user_id = actor_profile_id
where actor_user_id is null;

alter table public.groups
  alter column capacity drop default,
  alter column capacity set default 1;

alter table public.groups
  drop constraint if exists groups_capacity_positive;

alter table public.groups
  add constraint groups_capacity_positive check (capacity > 0);

alter table public.payments
  drop constraint if exists payments_amount_positive;

alter table public.payments
  add constraint payments_amount_positive check (amount > 0);

create index if not exists organizations_status_idx on public.organizations (status);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists parent_students_org_idx on public.parent_students (organization_id);
create index if not exists parent_students_parent_idx on public.parent_students (parent_id);
create index if not exists group_students_org_idx on public.group_students (organization_id);
create index if not exists group_students_status_idx on public.group_students (status);
create index if not exists lessons_status_idx on public.lessons (status);
create index if not exists lessons_org_starts_idx on public.lessons (organization_id, starts_at);
create index if not exists lessons_org_group_idx on public.lessons (organization_id, group_id);
create index if not exists lessons_teacher_idx on public.lessons (teacher_id);
create index if not exists students_deleted_idx on public.students (organization_id, is_deleted);
create index if not exists parents_deleted_idx on public.parents (organization_id, is_deleted);
create index if not exists teachers_deleted_idx on public.teachers (organization_id, is_deleted);
create index if not exists groups_deleted_idx on public.groups (organization_id, is_deleted);
create index if not exists payments_org_payment_idx on public.payments (organization_id, payment_date);
create index if not exists payments_org_due_idx on public.payments (organization_id, due_date);
create index if not exists exams_teacher_idx on public.exams (teacher_id);
create index if not exists homework_teacher_idx on public.homework (teacher_id);
create index if not exists telegram_accounts_org_user_idx on public.telegram_accounts (organization_id, telegram_user_id);
create index if not exists telegram_accounts_parent_idx on public.telegram_accounts (parent_id);
create index if not exists notification_queue_available_idx on public.notification_queue (status, available_at);
create index if not exists notification_queue_parent_idx on public.notification_queue (recipient_parent_id);
create index if not exists homework_submissions_org_idx on public.homework_submissions (organization_id);
create index if not exists exam_results_org_idx on public.exam_results (organization_id);
create index if not exists notification_logs_org_idx on public.notification_logs (organization_id);
create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index if not exists group_students_student_idx on public.group_students (student_id);
create index if not exists group_students_group_idx on public.group_students (group_id);
create index if not exists parent_students_student_idx on public.parent_students (student_id);
create index if not exists parent_students_parent_org_idx on public.parent_students (organization_id, parent_id);
create index if not exists attendance_org_lesson_idx on public.attendance (organization_id, lesson_id);
create index if not exists attendance_org_student_idx on public.attendance (organization_id, student_id);

create or replace function public.current_teacher_id(target_org uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teachers t
  join public.organization_members m on m.organization_id = t.organization_id
  where t.organization_id = target_org
    and t.profile_id = auth.uid()
    and t.is_deleted = false
    and m.profile_id = auth.uid()
    and m.status = 'ACTIVE'
    and m.role = 'TEACHER'
  limit 1;
$$;

create or replace function public.teacher_can_access_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.organization_id in (
        select m.organization_id
        from public.organization_members m
        where m.profile_id = auth.uid()
          and m.status = 'ACTIVE'
      )
      and g.is_deleted = false
      and (
        public.has_org_role(g.organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
        or g.teacher_id = public.current_teacher_id(g.organization_id)
      )
  );
$$;

create or replace function public.teacher_can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.group_students gs on gs.student_id = s.id
    join public.groups g on g.id = gs.group_id
    where s.id = target_student_id
      and s.is_deleted = false
      and g.is_deleted = false
      and g.teacher_id = public.current_teacher_id(s.organization_id)
  );
$$;

create or replace function public.teacher_can_access_lesson(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    where l.id = target_lesson_id
      and l.is_deleted = false
      and (
        l.teacher_id = public.current_teacher_id(l.organization_id)
        or exists (
          select 1
          from public.groups g
          where g.id = l.group_id
            and g.teacher_id = public.current_teacher_id(g.organization_id)
        )
      )
  );
$$;

create or replace function public.teacher_can_access_attendance(target_attendance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attendance a
    where a.id = target_attendance_id
      and public.teacher_can_access_lesson(a.lesson_id)
  );
$$;

create or replace function public.teacher_can_access_homework(target_homework_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.homework h
    where h.id = target_homework_id
      and h.organization_id in (
        select m.organization_id
        from public.organization_members m
        where m.profile_id = auth.uid()
          and m.status = 'ACTIVE'
      )
      and (
        public.has_org_role(h.organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
        or h.teacher_id = public.current_teacher_id(h.organization_id)
        or exists (
          select 1
          from public.groups g
          where g.id = h.group_id
            and g.teacher_id = public.current_teacher_id(g.organization_id)
        )
      )
  );
$$;

create or replace function public.teacher_can_access_exam(target_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = target_exam_id
      and (
        public.has_org_role(e.organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
        or e.teacher_id = public.current_teacher_id(e.organization_id)
        or exists (
          select 1
          from public.groups g
          where g.id = e.group_id
            and g.teacher_id = public.current_teacher_id(g.organization_id)
        )
      )
  );
$$;

create or replace function public.teacher_can_access_exam_result(target_exam_result_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exam_results er
    where er.id = target_exam_result_id
      and public.teacher_can_access_exam(er.exam_id)
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members viewer
    join public.organization_members target on target.organization_id = viewer.organization_id
    where viewer.profile_id = auth.uid()
      and viewer.status = 'ACTIVE'
      and viewer.role in ('OWNER', 'ADMIN')
      and target.profile_id = profiles.id
      and target.status = 'ACTIVE'
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members viewer
    join public.organization_members target on target.organization_id = viewer.organization_id
    where viewer.profile_id = auth.uid()
      and viewer.status = 'ACTIVE'
      and viewer.role in ('OWNER', 'ADMIN')
      and target.profile_id = profiles.id
      and target.status = 'ACTIVE'
  )
)
with check (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members viewer
    join public.organization_members target on target.organization_id = viewer.organization_id
    where viewer.profile_id = auth.uid()
      and viewer.status = 'ACTIVE'
      and viewer.role in ('OWNER', 'ADMIN')
      and target.profile_id = profiles.id
      and target.status = 'ACTIVE'
  )
);

drop policy if exists "organizations_select_members" on public.organizations;
create policy "organizations_select_members"
on public.organizations
for select
using (
  exists (
    select 1
    from public.organization_members m
    where m.organization_id = organizations.id
      and m.profile_id = auth.uid()
      and m.status = 'ACTIVE'
  )
);

drop policy if exists "organization_members_select_members" on public.organization_members;
create policy "organization_members_select_members"
on public.organization_members
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members viewer
    where viewer.organization_id = organization_members.organization_id
      and viewer.profile_id = auth.uid()
      and viewer.status = 'ACTIVE'
      and viewer.role in ('OWNER', 'ADMIN')
  )
);

drop policy if exists "organization_members_manage_admins" on public.organization_members;
create policy "organization_members_manage_admins"
on public.organization_members
for all
using (
  exists (
    select 1
    from public.organization_members viewer
    where viewer.organization_id = organization_members.organization_id
      and viewer.profile_id = auth.uid()
      and viewer.status = 'ACTIVE'
      and viewer.role in ('OWNER', 'ADMIN')
  )
)
with check (
  exists (
    select 1
    from public.organization_members viewer
    where viewer.organization_id = organization_members.organization_id
      and viewer.profile_id = auth.uid()
      and viewer.status = 'ACTIVE'
      and viewer.role in ('OWNER', 'ADMIN')
  )
);

drop policy if exists "staff_read_org_tables" on public.teachers;
create policy "staff_read_org_tables"
on public.teachers
for select
using (
  not is_deleted
  and (
    public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
    or profile_id = auth.uid()
  )
);

drop policy if exists "staff_write_teachers" on public.teachers;
create policy "staff_write_teachers"
on public.teachers
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or profile_id = auth.uid()
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or profile_id = auth.uid()
);

drop policy if exists "staff_read_parents" on public.parents;
create policy "staff_read_parents"
on public.parents
for select
using (
  not is_deleted
  and public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
);

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
using (
  not is_deleted
  and (
    public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
    or public.teacher_can_access_student(id)
  )
);

drop policy if exists "staff_write_students" on public.students;
create policy "staff_write_students"
on public.students
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_read_groups" on public.groups;
create policy "staff_read_groups"
on public.groups
for select
using (
  not is_deleted
  and (
    public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
    or public.teacher_can_access_group(id)
  )
);

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
using (
  (
    public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
    or public.teacher_can_access_lesson(id)
  )
);

drop policy if exists "staff_write_lessons" on public.lessons;
create policy "staff_write_lessons"
on public.lessons
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or teacher_id = public.current_teacher_id(organization_id)
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or teacher_id = public.current_teacher_id(organization_id)
);

drop policy if exists "staff_read_attendance" on public.attendance;
create policy "staff_read_attendance"
on public.attendance
for select
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_attendance(id)
);

drop policy if exists "staff_write_attendance" on public.attendance;
create policy "staff_write_attendance"
on public.attendance
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_lesson(lesson_id)
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_lesson(lesson_id)
);

drop policy if exists "staff_read_homework" on public.homework;
create policy "staff_read_homework"
on public.homework
for select
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_homework(id)
);

drop policy if exists "staff_write_homework" on public.homework;
create policy "staff_write_homework"
on public.homework
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or teacher_id = public.current_teacher_id(organization_id)
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or teacher_id = public.current_teacher_id(organization_id)
);

drop policy if exists "homework_submissions_read_org" on public.homework_submissions;
create policy "homework_submissions_read_org"
on public.homework_submissions
for select
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_homework(homework_id)
);

drop policy if exists "homework_submissions_write_org" on public.homework_submissions;
create policy "homework_submissions_write_org"
on public.homework_submissions
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_homework(homework_id)
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_homework(homework_id)
);

drop policy if exists "staff_read_exams" on public.exams;
create policy "staff_read_exams"
on public.exams
for select
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_exam(id)
);

drop policy if exists "staff_write_exams" on public.exams;
create policy "staff_write_exams"
on public.exams
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or teacher_id = public.current_teacher_id(organization_id)
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or teacher_id = public.current_teacher_id(organization_id)
);

drop policy if exists "staff_read_results" on public.exam_results;
create policy "staff_read_results"
on public.exam_results
for select
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_exam_result(id)
);

drop policy if exists "staff_write_results" on public.exam_results;
create policy "staff_write_results"
on public.exam_results
for all
using (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_exam(exam_id)
)
with check (
  public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[])
  or public.teacher_can_access_exam(exam_id)
);

drop policy if exists "staff_read_payments" on public.payments;
create policy "staff_read_payments"
on public.payments
for select
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

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
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "staff_write_notifications" on public.notification_queue;
create policy "staff_write_notifications"
on public.notification_queue
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "settings_manage_admins" on public.settings;
create policy "settings_manage_admins"
on public.settings
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "audit_logs_read_admins" on public.audit_logs;
create policy "audit_logs_read_admins"
on public.audit_logs
for select
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "audit_logs_manage_admins" on public.audit_logs;
create policy "audit_logs_manage_admins"
on public.audit_logs
for insert
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "telegram_accounts_manage_admins" on public.telegram_accounts;
create policy "telegram_accounts_manage_admins"
on public.telegram_accounts
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "parent_students_manage_admins" on public.parent_students;
create policy "parent_students_manage_admins"
on public.parent_students
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "group_students_manage_admins" on public.group_students;
create policy "group_students_manage_admins"
on public.group_students
for all
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]))
with check (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));

drop policy if exists "notification_logs_read_admins" on public.notification_logs;
create policy "notification_logs_read_admins"
on public.notification_logs
for select
using (public.has_org_role(organization_id, array['OWNER', 'ADMIN']::public.organization_role[]));
