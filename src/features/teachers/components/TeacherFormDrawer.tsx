import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import type { TeacherFormValues, TeacherStatus } from '@/features/teachers/types'

type TeacherFormDrawerProps = {
  open: boolean
  mode: 'create' | 'edit'
  onClose: () => void
  onSubmit: (values: TeacherFormValues) => Promise<void>
  busy?: boolean
  error?: string | null
  initialValues?: TeacherFormValues
}

const defaultValues: TeacherFormValues = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  specialization: '',
  status: 'ACTIVE',
}

const statusOptions: TeacherStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED']

function isValidPhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }

  return /^\+?[0-9\s()-]{7,20}$/.test(trimmed)
}

function isValidEmail(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }

  return /^\S+@\S+\.\S+$/.test(trimmed)
}

export function TeacherFormDrawer({
  open,
  mode,
  onClose,
  onSubmit,
  busy = false,
  error = null,
  initialValues,
}: TeacherFormDrawerProps) {
  const [values, setValues] = useState<TeacherFormValues>(initialValues ?? defaultValues)
  const [touched, setTouched] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? defaultValues)
      setTouched(false)
      setLocalError(null)
    }
  }, [initialValues, open])

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

    if (!isValidPhone(values.phone)) {
      return 'Phone number looks invalid.'
    }

    if (!isValidEmail(values.email)) {
      return 'Email address looks invalid.'
    }

    if (!values.specialization.trim()) {
      return 'Specialization is required.'
    }

    return null
  }, [touched, values])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setLocalError(null)
    await onSubmit(values)
  }

  return (
    <Drawer
      open={open}
      title={mode === 'create' ? 'Add teacher' : 'Edit teacher'}
      description="Manage the teacher CRM profile. This does not create a Supabase Auth account."
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="teacher-form" disabled={busy}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create teacher' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="teacher-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">First name</span>
            <Input value={values.first_name} onChange={(event) => setValues((current) => ({ ...current, first_name: event.target.value }))} placeholder="Javohir" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Last name</span>
            <Input value={values.last_name} onChange={(event) => setValues((current) => ({ ...current, last_name: event.target.value }))} placeholder="Rasulov" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phone</span>
            <Input value={values.phone} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} placeholder="+998 90 123 45 67" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <Input value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} placeholder="teacher@example.com" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Specialization</span>
            <Input value={values.specialization} onChange={(event) => setValues((current) => ({ ...current, specialization: event.target.value }))} placeholder="Mathematics" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Status</span>
            <Select value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as TeacherStatus }))}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </label>
        </div>
        {validationError || localError || error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {validationError || localError || error}
          </p>
        ) : null}
      </form>
    </Drawer>
  )
}
