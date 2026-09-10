import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { Textarea } from '@/components/Textarea'
import type { StudentFormValues, StudentStatus, Gender } from '@/features/students/types'

type StudentFormDrawerProps = {
  open: boolean
  mode: 'create' | 'edit'
  onClose: () => void
  onSubmit: (values: StudentFormValues) => Promise<void>
  busy?: boolean
  error?: string | null
  initialValues?: StudentFormValues
}

const defaultValues: StudentFormValues = {
  first_name: '',
  last_name: '',
  phone: '',
  birth_date: '',
  gender: '',
  status: 'ACTIVE',
  notes: '',
}

const statusOptions: StudentStatus[] = ['ACTIVE', 'INACTIVE', 'FROZEN', 'GRADUATED', 'LEFT']
const genderOptions: Array<{ value: Gender; label: string }> = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
]

function isPhoneLike(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }

  return /^\+?[0-9\s()-]{7,20}$/.test(trimmed)
}

function isValidBirthDate(value: string) {
  if (!value) {
    return true
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }

  const now = new Date()
  return parsed <= now
}

export function StudentFormDrawer({
  open,
  mode,
  onClose,
  onSubmit,
  busy = false,
  error = null,
  initialValues,
}: StudentFormDrawerProps) {
  const [values, setValues] = useState<StudentFormValues>(initialValues ?? defaultValues)
  const [touched, setTouched] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setValues(initialValues ?? defaultValues)
    setTouched(false)
    setLocalError(null)
  }, [open, initialValues])

  const validationError = useMemo(() => {
    if (!touched) {
      return null
    }

    if (!values.first_name.trim()) {
      return 'First name is required.'
    }

    if (!values.last_name.trim()) {
      return 'Last name is required.'
    }

    if (!isPhoneLike(values.phone)) {
      return 'Phone number looks invalid.'
    }

    if (!isValidBirthDate(values.birth_date)) {
      return 'Birth date must be a valid past date.'
    }

    if (!values.gender) {
      return 'Gender is required.'
    }

    if (!values.status) {
      return 'Status is required.'
    }

    return null
  }, [touched, values])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    const nextError = validationError ?? null

    if (nextError) {
      setLocalError(nextError)
      return
    }

    setLocalError(null)
    await onSubmit(values)
  }

  return (
    <Drawer
      open={open}
      title={mode === 'create' ? 'Add student' : 'Edit student'}
      description="Manage the student profile and academic status."
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="student-form" disabled={busy}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create student' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="student-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">First name</span>
            <Input
              value={values.first_name}
              onChange={(event) => setValues((current) => ({ ...current, first_name: event.target.value }))}
              onBlur={() => setTouched(true)}
              placeholder="Ali"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Last name</span>
            <Input
              value={values.last_name}
              onChange={(event) => setValues((current) => ({ ...current, last_name: event.target.value }))}
              onBlur={() => setTouched(true)}
              placeholder="Valiyev"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phone</span>
            <Input
              value={values.phone}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+998 90 123 45 67"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Birth date</span>
            <Input
              type="date"
              value={values.birth_date}
              onChange={(event) => setValues((current) => ({ ...current, birth_date: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Gender</span>
            <Select
              value={values.gender}
              onChange={(event) =>
                setValues((current) => ({ ...current, gender: event.target.value as Gender | '' }))
              }
            >
              <option value="">Select gender</option>
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Status</span>
            <Select
              value={values.status}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  status: event.target.value as StudentStatus,
                }))
              }
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-semibold">Notes</span>
          <Textarea
            value={values.notes}
            onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Learning support, behavior, family context, or medical notes."
          />
        </label>

        {validationError || localError || error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {validationError || localError || error}
          </p>
        ) : null}
      </form>
    </Drawer>
  )
}
