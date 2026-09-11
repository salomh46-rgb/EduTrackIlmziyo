-- 0004_parent_portal_and_payment_notification.sql
-- Adds PAYMENT_RECEIVED to notification_type and provides secure RPC for Parent Portal

do $$
begin
  alter type public.notification_type add value if not exists 'PAYMENT_RECEIVED';
exception
  when duplicate_object then null;
end $$;

-- RPC helper for Parent Portal & Telegram Mini App data retrieval
create or replace function public.get_parent_portal_data(
  p_token text default null,
  p_telegram_user_id bigint default null,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid;
  v_student record;
  v_group record;
  v_attendance jsonb;
  v_exams jsonb;
  v_payments jsonb;
  v_total_paid numeric(12,2) := 0;
  v_total_due numeric(12,2) := 0;
  v_balance numeric(12,2) := 0;
  v_org record;
  v_attendance_rate numeric(5,2) := 100.0;
  v_average_score numeric(5,2) := 0.0;
  v_present_count integer := 0;
  v_total_lessons integer := 0;
begin
  -- Resolve parent by telegram_user_id or verification token
  if p_telegram_user_id is not null then
    select parent_id into v_parent_id
    from public.telegram_accounts
    where telegram_user_id = p_telegram_user_id
    limit 1;

    if v_parent_id is null then
      select id into v_parent_id
      from public.parents
      where telegram_user_id = p_telegram_user_id
      limit 1;
    end if;
  end if;

  if v_parent_id is null and p_token is not null and p_token <> '' then
    -- Check telegram_accounts token hash or direct token
    select parent_id into v_parent_id
    from public.telegram_accounts
    where verification_token_hash = p_token
       or verification_token_hash = encode(digest(p_token, 'sha256'), 'hex')
    limit 1;
  end if;

  -- Pick student
  if p_student_id is not null then
    select s.* into v_student
    from public.students s
    where s.id = p_student_id
      and (v_parent_id is null or exists (
        select 1 from public.parent_students ps
        where ps.student_id = s.id and ps.parent_id = v_parent_id
      ))
      and s.is_deleted = false
    limit 1;
  elsif v_parent_id is not null then
    select s.* into v_student
    from public.students s
    join public.parent_students ps on ps.student_id = s.id
    where ps.parent_id = v_parent_id
      and s.is_deleted = false
    order by ps.is_primary desc, s.created_at asc
    limit 1;
  end if;

  -- If still no student found, return null payload
  if v_student.id is null then
    return jsonb_build_object(
      'found', false,
      'message', 'Student or verified parent record not found.'
    );
  end if;

  -- Fetch primary group
  select g.* into v_group
  from public.groups g
  join public.group_students gs on gs.group_id = g.id
  where gs.student_id = v_student.id
    and g.is_deleted = false
  order by gs.joined_at desc
  limit 1;

  -- Organization info
  select o.id, o.name into v_org
  from public.organizations o
  where o.id = v_student.organization_id;

  -- 30-day attendance
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'lesson_date', a.lesson_date,
        'status', a.status,
        'note', a.note,
        'topic', l.topic,
        'lesson_title', l.title
      ) order by a.lesson_date desc
    ), '[]'::jsonb),
    count(*) filter (where a.status in ('PRESENT', 'LATE')),
    count(*)
  into v_attendance, v_present_count, v_total_lessons
  from public.attendance a
  left join public.lessons l on l.id = a.lesson_id
  where a.student_id = v_student.id
    and a.lesson_date >= (current_date - interval '30 days');

  if v_total_lessons > 0 then
    v_attendance_rate := round((v_present_count::numeric / v_total_lessons::numeric) * 100, 1);
  else
    v_attendance_rate := 100.0;
  end if;

  -- Exam results
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', er.id,
        'title', e.title,
        'subject', e.subject,
        'exam_date', e.exam_date,
        'score', er.score,
        'maximum_score', e.maximum_score,
        'percentage', er.percentage,
        'grade', er.grade,
        'teacher_comment', er.teacher_comment
      ) order by e.exam_date desc
    ), '[]'::jsonb),
    coalesce(round(avg(er.percentage), 1), 0.0)
  into v_exams, v_average_score
  from public.exam_results er
  join public.exams e on e.id = er.exam_id
  where er.student_id = v_student.id;

  -- Payments & Balance
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'amount', p.amount,
        'payment_date', p.payment_date,
        'due_date', p.due_date,
        'status', p.status,
        'method', p.method,
        'note', p.note
      ) order by coalesce(p.payment_date, p.due_date) desc
    ), '[]'::jsonb),
    coalesce(sum(case when p.status = 'PAID' then p.amount else 0 end), 0),
    coalesce(sum(case when p.status in ('PENDING', 'OVERDUE') then p.amount else 0 end), 0)
  into v_payments, v_total_paid, v_total_due
  from public.payments p
  where p.student_id = v_student.id;

  v_balance := v_total_paid - v_total_due;

  return jsonb_build_object(
    'found', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'first_name', v_student.first_name,
      'last_name', v_student.last_name,
      'full_name', v_student.first_name || ' ' || v_student.last_name,
      'phone', v_student.phone,
      'avatar_url', v_student.avatar_url,
      'status', v_student.status,
      'group_name', coalesce(v_group.name, 'Asosiy guruh'),
      'subject', coalesce(v_group.subject, 'Umumiy ta''lim'),
      'attendance_rate', v_attendance_rate,
      'average_score', v_average_score
    ),
    'attendance', v_attendance,
    'exams', v_exams,
    'payments', jsonb_build_object(
      'history', v_payments,
      'total_paid', v_total_paid,
      'total_due', v_total_due,
      'balance', v_balance,
      'is_overdue', v_total_due > 0
    ),
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', coalesce(v_org.name, 'EduTrack Ilmziyo')
    )
  );
end;
$$;

-- Grant execution to anon and authenticated
grant execute on function public.get_parent_portal_data(text, bigint, uuid) to anon, authenticated;
