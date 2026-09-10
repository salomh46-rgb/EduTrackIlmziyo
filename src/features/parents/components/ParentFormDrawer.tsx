import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import type { ParentFormValues } from '@/features/parents/types'

type ParentFormDrawerProps = {
  open: boolean
  mode: 'create' | 'edit'
  onClose: () => void
  onSubmit: (values: ParentFormValues) => Promise<void>
  busy?: boolean
  error?: string | null
  initialValues?: ParentFormValues
}

const defaultValues: ParentFormValues = { first_name: '', last_name: '', phone: '', email: '' }

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

export function ParentFormDrawer({
  open,
  mode,
  onClose,
  onSubmit,
  busy = false,
  error = null,
  initialValues,
}: ParentFormDrawerProps) {
  const [values, setValues] = useState<ParentFormValues>(initialValues ?? defaultValues)
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
      title={mode === 'create' ? 'Add parent' : 'Edit parent'}
      description="Manage the parent contact profile."
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="parent-form" disabled={busy}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create parent' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="parent-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">First name</span>
            <Input value={values.first_name} onChange={(event) => setValues((current) => ({ ...current, first_name: event.target.value }))} placeholder="Madina" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Last name</span>
            <Input value={values.last_name} onChange={(event) => setValues((current) => ({ ...current, last_name: event.target.value }))} placeholder="Karimova" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Phone</span>
            <Input value={values.phone} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} placeholder="+998 90 123 45 67" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <Input value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} placeholder="parent@example.com" />
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
