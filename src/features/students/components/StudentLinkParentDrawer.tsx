import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import type { RelationshipType, StudentParentSummary } from '@/features/students/types'

type ParentOption = StudentParentSummary

type StudentLinkParentDrawerProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: { parentId: string; relationshipType: RelationshipType; isPrimary: boolean }) => Promise<void>
  busy?: boolean
  error?: string | null
  parentOptions: ParentOption[]
  linkedParentIds: string[]
}

const relationshipOptions: Array<{ value: RelationshipType; label: string }> = [
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'OTHER', label: 'Other' },
]

export function StudentLinkParentDrawer({
  open,
  onClose,
  onSubmit,
  busy = false,
  error = null,
  parentOptions,
  linkedParentIds,
}: StudentLinkParentDrawerProps) {
  const availableParents = useMemo(
    () => parentOptions.filter((parent) => !linkedParentIds.includes(parent.id)),
    [linkedParentIds, parentOptions],
  )
  const [parentId, setParentId] = useState('')
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('GUARDIAN')
  const [isPrimary, setIsPrimary] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setParentId(availableParents[0]?.id ?? '')
      setRelationshipType('GUARDIAN')
      setIsPrimary(false)
      setLocalError(null)
    }
  }, [availableParents, open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!parentId) {
      setLocalError('Please choose a parent to link.')
      return
    }

    setLocalError(null)
    await onSubmit({ parentId, relationshipType, isPrimary })
  }

  return (
    <Drawer
      open={open}
      title="Link parent"
      description="Connect an existing parent record to this student."
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="link-parent-form" disabled={busy || availableParents.length === 0}>
            {busy ? 'Linking...' : 'Link parent'}
          </Button>
        </div>
      }
    >
      <form id="link-parent-form" className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Parent</span>
          <Select value={parentId} onChange={(event) => setParentId(event.target.value)}>
            {availableParents.length === 0 ? <option value="">No available parents</option> : null}
            {availableParents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.first_name} {parent.last_name} {parent.phone ? `- ${parent.phone}` : ''}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Relationship type</span>
          <Select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as RelationshipType)}>
            {relationshipOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] px-4 py-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(event) => setIsPrimary(event.target.checked)}
            className="h-4 w-4 rounded border-[rgb(var(--border))] text-[rgb(var(--primary))]"
          />
          Primary guardian
        </label>

        {availableParents.length === 0 ? (
          <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            All available parents are already linked to this student.
          </p>
        ) : null}

        {localError || error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {localError || error}
          </p>
        ) : null}
      </form>
    </Drawer>
  )
}
