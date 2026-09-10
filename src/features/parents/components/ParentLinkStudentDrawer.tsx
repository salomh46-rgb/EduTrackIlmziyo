import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import type { RelationshipType } from '@/features/students/types'

type StudentOption = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
}

type ParentLinkStudentDrawerProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: { studentId: string; relationshipType: RelationshipType; isPrimary: boolean }) => Promise<void>
  busy?: boolean
  error?: string | null
  studentOptions: StudentOption[]
  linkedStudentIds: string[]
}

const relationshipOptions: Array<{ value: RelationshipType; label: string }> = [
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'OTHER', label: 'Other' },
]

export function ParentLinkStudentDrawer({
  open,
  onClose,
  onSubmit,
  busy = false,
  error = null,
  studentOptions,
  linkedStudentIds,
}: ParentLinkStudentDrawerProps) {
  const availableStudents = useMemo(
    () => studentOptions.filter((student) => !linkedStudentIds.includes(student.id)),
    [linkedStudentIds, studentOptions],
  )
  const [studentId, setStudentId] = useState('')
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('GUARDIAN')
  const [isPrimary, setIsPrimary] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStudentId(availableStudents[0]?.id ?? '')
      setRelationshipType('GUARDIAN')
      setIsPrimary(false)
      setLocalError(null)
    }
  }, [availableStudents, open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!studentId) {
      setLocalError('Please choose a student to link.')
      return
    }

    setLocalError(null)
    await onSubmit({ studentId, relationshipType, isPrimary })
  }

  return (
    <Drawer
      open={open}
      title="Link student"
      description="Connect an existing student record to this parent."
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="link-student-form" disabled={busy || availableStudents.length === 0}>
            {busy ? 'Linking...' : 'Link student'}
          </Button>
        </div>
      }
    >
      <form id="link-student-form" className="space-y-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Student</span>
          <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {availableStudents.length === 0 ? <option value="">No available students</option> : null}
            {availableStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} {student.phone ? `- ${student.phone}` : ''}
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
          Primary child
        </label>
        {availableStudents.length === 0 ? (
          <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            All available students are already linked to this parent.
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
