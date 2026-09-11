import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Drawer } from '@/components/Drawer'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import type { GroupFormValues, GroupListItem } from '@/features/groups/types'

const daysOfWeek = [
  { key: 'Dush', label: 'Dushanba' },
  { key: 'Sesh', label: 'Seshanba' },
  { key: 'Chor', label: 'Chorshanba' },
  { key: 'Pay', label: 'Payshanba' },
  { key: 'Juma', label: 'Juma' },
  { key: 'Shan', label: 'Shanba' },
  { key: 'Yak', label: 'Yakshanba' },
]

type GroupFormDrawerProps = {
  open: boolean
  group: GroupListItem | null
  teachers: Array<{ id: string; first_name: string; last_name: string; specialization: string | null }>
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: GroupFormValues) => Promise<void>
}

const defaultValues: GroupFormValues = {
  name: '',
  subject: '',
  teacher_id: '',
  room: '',
  schedule_days: ['Dush', 'Chor', 'Juma'],
  schedule_time: '14:00 - 16:00',
  capacity: 15,
  status: 'ACTIVE',
}

export function GroupFormDrawer({
  open,
  group,
  teachers,
  busy,
  error,
  onClose,
  onSubmit,
}: GroupFormDrawerProps) {
  const [formValues, setFormValues] = useState<GroupFormValues>(defaultValues)

  useEffect(() => {
    if (group) {
      setFormValues({
        name: group.name,
        subject: group.subject,
        teacher_id: group.teacher_id ?? '',
        room: group.room ?? '',
        schedule_days: group.schedule?.days ?? ['Dush', 'Chor', 'Juma'],
        schedule_time: group.schedule?.time ?? '',
        capacity: group.capacity,
        status: group.status,
      })
    } else {
      setFormValues(defaultValues)
    }
  }, [group, open])

  const toggleDay = (dayKey: string) => {
    setFormValues((prev) => {
      const exists = prev.schedule_days.includes(dayKey)
      return {
        ...prev,
        schedule_days: exists
          ? prev.schedule_days.filter((d) => d !== dayKey)
          : [...prev.schedule_days, dayKey],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formValues)
  }

  return (
    <Drawer
      open={open}
      title={group ? 'Guruhni Tahrirlash' : 'Yangi Guruh Yaratish'}
      description="Guruh parametrlari, o'qituvchi va dars jadvalini belgilang."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="group-form" disabled={busy}>
            {busy ? 'Saqlanmoqda...' : group ? 'Oʼzgarishlarni saqlash' : 'Guruhni yaratish'}
          </Button>
        </div>
      }
    >
      <form id="group-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--text))]">
            Guruh Nomi <span className="text-rose-500">*</span>
          </label>
          <Input
            required
            placeholder="Masalan: IELTS Master 1 yoki Rus tili B1"
            value={formValues.name}
            onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[rgb(var(--text))]">
              Fan / Yoʼnalish <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="Masalan: Ingliz tili"
              value={formValues.subject}
              onChange={(e) => setFormValues({ ...formValues, subject: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[rgb(var(--text))]">Xona</label>
            <Input
              placeholder="Masalan: 204-xona"
              value={formValues.room}
              onChange={(e) => setFormValues({ ...formValues, room: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--text))]">O'qituvchi</label>
          <Select
            value={formValues.teacher_id}
            onChange={(e) => setFormValues({ ...formValues, teacher_id: e.target.value })}
          >
            <option value="">Oʼqituvchi biriktirilmagan</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name} {t.specialization ? `(${t.specialization})` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[rgb(var(--text))]">Dars Kunlari</label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => {
              const active = formValues.schedule_days.includes(day.key)
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                      : 'border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))] text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
                  }`}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[rgb(var(--text))]">Dars Vaqti</label>
            <Input
              placeholder="Masalan: 14:00 - 16:00"
              value={formValues.schedule_time}
              onChange={(e) => setFormValues({ ...formValues, schedule_time: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[rgb(var(--text))]">Sigʼim (Maksimal oʼquvchi)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formValues.capacity}
              onChange={(e) => setFormValues({ ...formValues, capacity: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[rgb(var(--text))]">Status</label>
          <Select
            value={formValues.status}
            onChange={(e) =>
              setFormValues({
                ...formValues,
                status: e.target.value as GroupFormValues['status'],
              })
            }
          >
            <option value="ACTIVE">Faol (ACTIVE)</option>
            <option value="PLANNED">Rejalashtirilgan (PLANNED)</option>
            <option value="ARCHIVED">Arxivlangan (ARCHIVED)</option>
          </Select>
        </div>
      </form>
    </Drawer>
  )
}
