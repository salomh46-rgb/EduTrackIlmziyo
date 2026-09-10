# EduTrackIlmziyo Implementation Plan

## 1. Product Goal

EduTrackIlmziyo is a multi-tenant tutoring center CRM and student management platform with:

- student, parent, teacher, group, lesson, attendance, homework, exam, result, payment, and analytics workflows
- a Telegram-first parent notification system
- secure Supabase authentication and PostgreSQL storage
- a responsive SaaS dashboard optimized for desktop and mobile

The product will be built in controlled phases so each layer is shippable and testable before the next one starts.

## 2. Architecture

### Frontend

- React 19
- TypeScript in strict mode
- Vite for local development and production builds
- Tailwind CSS for utility styling
- React Router for navigation
- A small reusable component system for cards, buttons, badges, states, and layout primitives
- Theme support through a light/dark mode provider backed by local storage

### Backend and Data

- Supabase Auth for authentication
- PostgreSQL as the system of record
- Row Level Security on every business table
- Supabase Storage for avatars and attachments
- Supabase Edge Functions for Telegram webhooks and background notification processing

### Integration Strategy

- The frontend never talks directly to Telegram or any privileged secret
- Telegram bot token and service-role credentials stay server-side only
- Attendance writes create notification queue rows first
- Notification delivery happens asynchronously through a worker or edge function

## 3. Folder Structure

```text
src/
  app/
    shell/
  components/
  features/
    dashboard/
    shared/
  lib/
  styles/
  types/
supabase/
  migrations/
  functions/
```

Notes:

- `app/` holds routing and the application shell
- `components/` holds reusable UI primitives
- `features/` holds page-level business modules
- `lib/` holds shared utilities and service adapters
- `supabase/` holds SQL migrations and edge function entry points

## 4. Database Plan

The first migration will establish a normalized schema using UUID primary keys, timestamps, foreign keys, and enums.

Core tables:

- `profiles`
- `organizations`
- `organization_members`
- `teachers`
- `parents`
- `students`
- `parent_students`
- `groups`
- `group_students`
- `lessons`
- `attendance`
- `homework`
- `homework_submissions`
- `exams`
- `exam_results`
- `payments`
- `telegram_accounts`
- `notification_templates`
- `notification_queue`
- `notification_logs`
- `settings`
- `audit_logs`

Database rules:

- every business table uses `uuid` primary keys
- foreign keys are explicit and indexed
- status fields use enums instead of magic strings
- `updated_at` is maintained by trigger
- RLS is enabled on all sensitive tables
- write access is restricted to authorized organization members

## 5. Security Strategy

- Supabase Auth for all authenticated access
- Row Level Security on every tenant-scoped table
- server-side secrets only for Telegram and privileged jobs
- no Telegram bot token in the frontend bundle
- environment variables validated before creating clients
- request payload validation in edge functions
- least-privilege access for staff roles

Role model:

- `OWNER`
- `ADMIN`
- `TEACHER`
- future-ready support for `PARENT` and `STUDENT`

## 6. Telegram Architecture

Flow:

1. Parent opens the Telegram bot
2. Bot requests phone verification
3. Parent account is matched or created
4. Parent is linked to one or more students
5. Notification preferences are stored in `telegram_accounts`
6. Attendance, homework, exam, and payment events enqueue notifications
7. A worker sends messages and records delivery state in logs

Planned edge functions:

- `telegram-webhook`
- `notification-worker`
- `telegram-verify`

Notification pipeline:

- queued
- processing
- sent
- failed

Retries will use a bounded retry policy with error logging.

## 7. Development Phases

### Phase 1 - Project Foundation

- scaffold the Vite React TypeScript app
- add Tailwind and global theming
- create the app shell
- create shared UI primitives
- establish navigation and placeholder module routes
- add the first database migration skeleton

### Phase 2 - Authentication and Authorization

- Supabase Auth integration
- protected routes
- role-aware session handling
- profile bootstrap

Status: completed in foundation form. The app now has session initialization, login/logout flow, route guards, role-aware navigation, profile loading, and baseline RLS hardening.

### Phase 3 - Database Schema

- finalize the normalized PostgreSQL schema
- add indexes, constraints, and RLS policies
- validate schema via migration review

Status: completed in hardening form. The database now has a documented audit, stronger tenant isolation, additional relational columns, and Phase 3 verification queries.

### Phase 4 - Application Shell

- dashboard navigation
- search, theme, notifications, and profile actions
- responsive mobile sidebar behavior

Status: completed in shell form. The app now has grouped role-aware navigation, a responsive slide-in sidebar, route-aware topbar context, reusable page headers and page containers, polished loading and empty states, and a dedicated not-found screen.

### Phase 5 - Students, Parents, Teachers

- CRUD workflows
- profile views
- relation management

### Phase 6 - Groups and Lessons

- group management
- lesson scheduling
- teacher assignment

### Phase 7 - Attendance

- daily attendance workspace
- bulk actions
- write-through to the notification queue

### Phase 8 - Telegram Integration

- webhook verification
- parent linking
- notification delivery

### Phase 9 - Payments

- payment records
- reminders
- revenue summaries

### Phase 10 - Homework

- homework creation
- submission tracking
- Telegram alerts

### Phase 11 - Exams and Results

- exam setup
- score capture
- grade visibility

### Phase 12 - Analytics

- operational metrics
- charts
- performance summaries

### Phase 13 - Polish

- accessibility pass
- responsive refinements
- loading, empty, success, and error states

### Phase 14 - Testing and Security Review

- type checking
- production builds
- smoke tests
- RLS review
- secrets review

## 8. Dependencies

Planned runtime dependencies:

- `react`
- `react-dom`
- `react-router-dom`
- `lucide-react`
- `@supabase/supabase-js`

Planned development dependencies:

- `vite`
- `typescript`
- `@vitejs/plugin-react`
- `tailwindcss`
- `postcss`
- `autoprefixer`
- type packages for React

Testing and quality tools may be added after the foundation is stable.

## 9. Testing Strategy

- `tsc --noEmit` for type safety
- Vite production build checks after each major phase
- component and helper tests once business logic exists
- manual smoke testing of the shell and navigation
- final security review for secrets, RLS, and environment access

## 10. Phase 1 Deliverables

- project scaffold
- buildable app shell
- theme system
- reusable UI primitives
- module navigation
- Supabase client placeholder
- initial SQL migration skeleton
