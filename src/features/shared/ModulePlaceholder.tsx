import { ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

type ModulePlaceholderProps = {
  title: string
  description: string
  phaseLabel: string
  focusAreas: string[]
}

export function ModulePlaceholder({ title, description, phaseLabel, focusAreas }: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader badge={phaseLabel} title={title} description={description} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--muted))]">
            <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
            Planned capabilities
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {focusAreas.map((focus) => (
              <div
                key={focus}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-4 text-sm font-semibold"
              >
                {focus}
              </div>
            ))}
          </div>
        </Card>

        <EmptyState
          icon={<ArrowRight className="h-5 w-5" />}
          title="Module scaffold is in place"
          description="This page is wired into the app shell and will be connected to live Supabase data in the next implementation phase."
          action={
            <Button type="button" variant="secondary">
              Continue phase work
            </Button>
          }
        />
      </div>
    </div>
  )
}
