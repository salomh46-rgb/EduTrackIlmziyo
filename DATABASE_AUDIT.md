# Database Audit

## Scope

Audited migrations:

- [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql)
- [`supabase/migrations/0002_auth_foundation.sql`](./supabase/migrations/0002_auth_foundation.sql)
- [`supabase/migrations/0003_database_hardening.sql`](./supabase/migrations/0003_database_hardening.sql)

## Final Schema Overview

### Core tenancy

- `organizations`
- `organization_members`

### Identity and profiles

- `profiles`

### Staff and learners

- `teachers`
- `parents`
- `students`
- `parent_students`

### Learning structure

- `groups`
- `group_students`
- `lessons`
- `attendance`
- `homework`
- `homework_submissions`
- `exams`
- `exam_results`

### Finance and messaging

- `payments`
- `telegram_accounts`
- `notification_templates`
- `notification_queue`
- `notification_logs`

### Governance

- `settings`
- `audit_logs`

## Enums

Current enums:

- `organization_role`
- `member_status`
- `student_status`
- `teacher_status`
- `group_status`
- `group_membership_status`
- `student_relationship_type`
- `lesson_status`
- `attendance_status`
- `payment_status`
- `notification_status`
- `notification_type`

Notes:

- `lesson_status` was introduced in Phase 3 so lesson records are explicit and not just free-form text.
- `student_relationship_type` standardizes parent/student relationship values.

## Keys and Relationships

### Primary keys

All business tables use UUID primary keys.

### Important foreign keys

- `profiles.id -> auth.users.id`
- `organization_members.organization_id -> organizations.id`
- `organization_members.user_id -> profiles.id`
- `teachers.organization_id -> organizations.id`
- `teachers.profile_id -> profiles.id`
- `parents.organization_id -> organizations.id`
- `parents.profile_id -> profiles.id`
- `students.organization_id -> organizations.id`
- `parent_students.parent_id -> parents.id`
- `parent_students.student_id -> students.id`
- `parent_students.organization_id -> organizations.id`
- `groups.organization_id -> organizations.id`
- `groups.teacher_id -> teachers.id`
- `group_students.group_id -> groups.id`
- `group_students.student_id -> students.id`
- `group_students.organization_id -> organizations.id`
- `lessons.group_id -> groups.id`
- `lessons.teacher_id -> teachers.id`
- `attendance.lesson_id -> lessons.id`
- `attendance.student_id -> students.id`
- `payments.student_id -> students.id`
- `telegram_accounts.parent_id -> parents.id`
- `notification_queue.recipient_parent_id -> parents.id`
- `notification_logs.queue_id -> notification_queue.id`
- `exam_results.exam_id -> exams.id`
- `homework_submissions.homework_id -> homework.id`

## Indexes

Notable indexes:

- organization scoping indexes on `organizations`, `organization_members`, `teachers`, `parents`, `students`, `groups`
- `lessons(organization_id, starts_at)`
- `lessons(organization_id, group_id)`
- `attendance(lesson_id)`
- `attendance(student_id)`
- `payments(student_id)`
- `payments(organization_id, payment_date)`
- `payments(organization_id, due_date)`
- `telegram_accounts(organization_id, telegram_user_id)`
- `notification_queue(status, available_at)`
- `notification_queue(recipient_parent_id)`
- `parent_students(organization_id)`
- `group_students(organization_id)`
- `homework_submissions(organization_id)`
- `exam_results(organization_id)`
- `notification_logs(organization_id)`

## Triggers

- `set_updated_at()` applies to all major mutable tables.
- `on_auth_user_created` populates `public.profiles` from `auth.users`.

## Helper Functions

Security helpers:

- `is_org_member(target_org uuid)`
- `has_org_role(target_org uuid, allowed_roles organization_role[])`
- `current_app_role()`
- `has_app_role(allowed_roles organization_role[])`
- `is_profile_owner(target_profile_id uuid)`
- `current_teacher_id(target_org uuid)`
- `teacher_can_access_group(target_group_id uuid)`
- `teacher_can_access_student(target_student_id uuid)`
- `teacher_can_access_lesson(target_lesson_id uuid)`
- `teacher_can_access_attendance(target_attendance_id uuid)`
- `teacher_can_access_homework(target_homework_id uuid)`
- `teacher_can_access_exam(target_exam_id uuid)`
- `teacher_can_access_exam_result(target_exam_result_id uuid)`

## RLS Strategy

### Tenant isolation

Tenant isolation is enforced through `organization_id` on business tables and RLS policies that compare rows to the current user's active organization memberships.

### Role model

- `OWNER` and `ADMIN` have full operational access inside their own organization.
- `TEACHER` can access only teaching-related data tied to assigned groups, lessons, attendance, homework, and exams.
- `PARENT` and `STUDENT` are not enabled yet.

### Table access summary

#### `organizations`

- SELECT: active members of the organization
- INSERT: not exposed in the current app flow
- UPDATE: owner/admin only, same tenant
- DELETE: owner/admin only, same tenant

#### `organization_members`

- SELECT: self or owner/admin within same tenant
- INSERT/UPDATE/DELETE: owner/admin within same tenant

#### `profiles`

- SELECT: self or owner/admin within same tenant
- UPDATE: self or owner/admin within same tenant
- INSERT/DELETE: handled by auth trigger or owner/admin workflows

#### `teachers`

- SELECT: self, or owner/admin in the same tenant
- INSERT/UPDATE/DELETE: owner/admin in the same tenant

#### `parents`

- SELECT: owner/admin only in the current hardened phase
- INSERT/UPDATE/DELETE: owner/admin only

#### `students`

- SELECT: owner/admin in the same tenant, or teacher for assigned students
- INSERT/UPDATE/DELETE: owner/admin only

#### `groups`

- SELECT: owner/admin in the same tenant, or teacher for assigned groups
- INSERT/UPDATE/DELETE: owner/admin only

#### `lessons`

- SELECT: owner/admin in the same tenant, or teacher for assigned lessons
- INSERT/UPDATE/DELETE: owner/admin or owning teacher

#### `attendance`

- SELECT: owner/admin in the same tenant, or teacher for assigned lesson attendance
- INSERT/UPDATE/DELETE: owner/admin or teacher for the related lesson

#### `homework`

- SELECT: owner/admin in the same tenant, or teacher for the related teaching assignment
- INSERT/UPDATE/DELETE: owner/admin or owning teacher

#### `exams`

- SELECT: owner/admin in the same tenant, or teacher for assigned exams
- INSERT/UPDATE/DELETE: owner/admin or owning teacher

#### `exam_results`

- SELECT: owner/admin in the same tenant, or teacher for assigned exams
- INSERT/UPDATE/DELETE: owner/admin or teacher for assigned exam

#### `payments`

- SELECT/INSERT/UPDATE/DELETE: owner/admin only

#### `telegram_accounts`

- SELECT/INSERT/UPDATE/DELETE: owner/admin only

#### `notification_queue`

- SELECT/INSERT/UPDATE/DELETE: owner/admin only

#### `notification_logs`

- SELECT: owner/admin only
- INSERT: worker/admin path only

#### `settings`

- SELECT/INSERT/UPDATE/DELETE: owner/admin only

#### `audit_logs`

- SELECT: owner/admin only
- INSERT: owner/admin or system worker path

## Possible Inconsistencies

- `teacher` access is intentionally narrower than owner/admin access and currently favors operational safety over convenience.
- `parent_students` is the physical relationship table rather than the requested `student_parents` name. The relationship is normalized and documented, but the legacy table name remains for migration safety.
- `organization_members.user_id` was added as a clean alias for identity linkage while preserving the existing `profile_id` reference.

## Missing Constraints Addressed in Phase 3

- lesson end time must be later than start time
- group capacity must be greater than zero
- payment amount must be greater than zero
- duplicate attendance rows are prevented by unique `(student_id, lesson_id)`
- duplicate parent/student rows are prevented by unique `(parent_id, student_id)`
- duplicate group membership rows are prevented by unique `(group_id, student_id)`
- duplicate telegram links are prevented by unique `parent_id` and `telegram_user_id`

## Soft Delete Decisions

Soft delete columns were added to:

- `students`
- `parents`
- `teachers`
- `groups`

Reasoning:

- These tables are high-value records that should normally remain recoverable.
- Soft delete is not applied everywhere to avoid unnecessary complexity on immutable or log-style tables.

## Security Risks Reviewed

Risks found in earlier phases:

- role checks based on profile role alone were too broad for tenant isolation
- some tables lacked explicit organization-scoped policies
- multiple child tables did not store `organization_id`

Mitigations applied in Phase 3:

- role checks are now tenant-aware
- helper functions enforce org membership before access
- child tables gained explicit `organization_id` columns where practical
- teacher access is constrained to assigned teaching data

## Future Migration Requirements

- Introduce a dedicated `PARENT` and `STUDENT` role model when those portals are built.
- Consider renaming `parent_students` to `student_parents` in a later controlled migration if the application surface would benefit from the clearer name.
- Add row-level rules for parent and student portal access in a future phase.
- Add generated Supabase TypeScript types after the database schema stabilizes further.

## Known Limitations

- Organization creation is still best handled by privileged backend/admin workflows.
- Parent/student authentication is intentionally not enabled yet.
- Phase 3 focuses on tenant isolation and relational hardening, not full CRUD module behavior.

