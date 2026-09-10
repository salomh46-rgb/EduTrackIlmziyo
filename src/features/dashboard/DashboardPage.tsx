import {
  ArrowRight,
  CircleCheckBig,
  DatabaseZap,
  ShieldAlert,
  GraduationCap,
  Users,
  UserCheck,
  CalendarCheck2,
  TrendingUp,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'

const metrics = [
  {
    label: 'Total Students',
    value: 'Pending',
    hint: 'Waiting for the first Supabase sync.',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: 'Active Groups',
    value: 'Pending',
    hint: 'Groups will appear after the schema is connected.',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Teachers',
    value: 'Pending',
    hint: 'Staff records are modeled in the database plan.',
    icon: <UserCheck className="h-5 w-5" />,
  },
  {
    label: "Today's Attendance",
    value: 'Pending',
    hint: 'Attendance capture will activate in phase 7.',
    icon: <CalendarCheck2 className="h-5 w-5" />,
  },
  {
    label: 'Attendance Rate',
    value: 'Pending',
    hint: 'Will be calculated from lesson-level attendance rows.',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: 'Monthly Revenue',
    value: 'Pending',
    hint: 'Payments and recurring reminders come later in the roadmap.',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    label: 'Outstanding Payments',
    value: 'Pending',
    hint: 'Live balances will populate once payment records exist.',
    icon: <AlertCircle className="h-5 w-5" />,
  },
]

const emptySections = [
  {
    title: "Today's Lessons",
    description:
      'No live lessons are connected yet. Once groups and lessons are seeded, upcoming sessions will appear here.',
  },
  {
    title: 'Recent Attendance',
    description: 'Attendance events will stream into this panel as lesson rolls are saved.',
  },
  {
    title: 'Recent Payments',
    description: 'Payment activity will show here after the finance module is connected.',
  },
  {
    title: 'Recent Notifications',
    description: 'Telegram, email, and other notification history will appear here.',
  },
  {
    title: 'Student Performance',
    description: 'Grades, exam trends, and progress snapshots will surface here once results are stored.',
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Phase 4 shell"
        title="Workspace overview"
        description="This dashboard is intentionally honest: it confirms the shell, surfaces readiness, and leaves the business modules empty until their own phases land."
        actions={
          <>
            <Button type="button">
              Review architecture
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary">
              Open implementation plan
            </Button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--muted))]">
            <DatabaseZap className="h-4 w-4 text-[rgb(var(--primary))]" />
            System readiness
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Supabase', 'Not configured', 'warning'],
              ['Telegram bot', 'Awaiting token', 'warning'],
              ['Security baseline', 'Planned in schema', 'success'],
            ].map(([label, value, variant]) => (
              <div
                key={label}
                className="space-y-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-4"
              >
                <p className="text-sm font-semibold">{label}</p>
                <Badge variant={variant as 'warning' | 'success'} className="w-fit">
                  {value}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--muted))]">
            <ShieldAlert className="h-4 w-4 text-[rgb(var(--primary))]" />
            Immediate next steps
          </div>
          <ul className="space-y-3 text-sm text-[rgb(var(--muted))]">
            <li className="flex items-start gap-3">
              <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-500" />
              Shell structure, navigation, and profile actions are in place.
            </li>
            <li className="flex items-start gap-3">
              <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-500" />
              Phase 2 authentication and Phase 3 database hardening remain intact.
            </li>
            <li className="flex items-start gap-3">
              <CircleCheckBig className="mt-0.5 h-4 w-4 text-emerald-500" />
              The app is ready for the first CRUD module without changing the shell again.
            </li>
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {emptySections.map((section) => (
          <EmptyState
            key={section.title}
            title={section.title}
            description={section.description}
            action={
              <Button type="button" variant="secondary">
                Open module
              </Button>
            }
          />
        ))}
      </section>
    </div>
  )
}
