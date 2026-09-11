import type { StudentListItem, StudentUpsertInput, StudentStatus, Gender } from '@/features/students/types'
import type { DebtSummary, PaymentRecord } from '@/features/finance/types'

export type StudentCsvParseResult = {
  validStudents: StudentUpsertInput[]
  errors: Array<{ rowNumber: number; rawText: string; reason: string }>
  totalRows: number
}

/**
 * Escapes a field for safe CSV output.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).trim()
  // If contains commas, semicolons, quotes, or newlines, wrap in quotes and escape quotes
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

/**
 * Initiates browser download of a text string as a UTF-8 BOM CSV file.
 */
export function downloadCsv(filename: string, content: string): void {
  // \uFEFF is UTF-8 Byte Order Mark, crucial for Excel to recognize UTF-8 in Uzbek/Russian characters
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports a list of students to an Excel-friendly CSV.
 */
export function exportStudentsToCsv(students: StudentListItem[], filename = 'talabalar-royxati'): void {
  const headers = [
    'F.I.Sh',
    'Ism',
    'Familiya',
    'Telefon',
    "Tug'ilgan sana",
    'Jinsi',
    'Holati',
    'Asosiy guruh',
    'Asosiy ota-ona',
    'Ota-ona telefoni',
    'Guruhlar soni',
    'Izoh / Eslatmalar',
  ]

  const rows = students.map((s) => {
    const parentName = s.primary_parent
      ? `${s.primary_parent.first_name} ${s.primary_parent.last_name}`.trim()
      : ''
    const parentPhone = s.primary_parent?.phone ?? ''
    const groupName = s.primary_group?.name ?? ''

    return [
      escapeCsvValue(`${s.first_name} ${s.last_name}`.trim()),
      escapeCsvValue(s.first_name),
      escapeCsvValue(s.last_name),
      escapeCsvValue(s.phone ?? ''),
      escapeCsvValue(s.birth_date ?? ''),
      escapeCsvValue(s.gender === 'MALE' ? 'Erkak' : s.gender === 'FEMALE' ? 'Ayol' : s.gender ?? ''),
      escapeCsvValue(s.status),
      escapeCsvValue(groupName),
      escapeCsvValue(parentName),
      escapeCsvValue(parentPhone),
      escapeCsvValue(s.group_count),
      escapeCsvValue(s.notes ?? ''),
    ].join(',')
  })

  const csvContent = [headers.map(escapeCsvValue).join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadCsv(`${filename}-${dateStr}.csv`, csvContent)
}

/**
 * Generates and downloads a sample CSV template for importing students.
 */
export function downloadSampleStudentCsv(): void {
  const headers = ['Ism', 'Familiya', 'Telefon', "Tug'ilgan sana", 'Jinsi', 'Holati', 'Izoh']

  const sampleRows = [
    ['Jasurbek', 'Aliyev', '+998901234567', '2008-05-14', 'MALE', 'ACTIVE', "IELTS guruhiga nomzod"],
    ['Madinabonu', 'Karimova', '+998939876543', '2009-11-22', 'FEMALE', 'ACTIVE', "Matematika kursi"],
    ['Sardor', 'Rustamov', '+998945554433', '2007-03-09', 'MALE', 'ACTIVE', "Kechki guruh"],
  ]

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...sampleRows.map((r) => r.map(escapeCsvValue).join(',')),
  ].join('\r\n')

  downloadCsv('talabalar-import-shabloni.csv', csvContent)
}

/**
 * Splits a CSV line taking into account quoted strings with commas.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

/**
 * Normalizes phone numbers to standard Uzbek / international format (+998...)
 */
export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (!cleaned) return ''
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('998') && cleaned.length === 12) return `+${cleaned}`
  if (cleaned.length === 9) return `+998${cleaned}`
  return cleaned
}

/**
 * Parses and validates CSV content for importing students.
 */
export function parseStudentsFromCsv(csvContent: string): StudentCsvParseResult {
  const result: StudentCsvParseResult = {
    validStudents: [],
    errors: [],
    totalRows: 0,
  }

  if (!csvContent || !csvContent.trim()) {
    result.errors.push({ rowNumber: 0, rawText: '', reason: 'Fayl bo‘sh yoki o‘qib bo‘lmadi.' })
    return result
  }

  // Detect delimiter (semicolon or comma)
  const firstLine = csvContent.split(/\r?\n/)[0] ?? ''
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = semicolonCount > commaCount ? ';' : ','

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    result.errors.push({
      rowNumber: 1,
      rawText: firstLine,
      reason: "Faylda ma'lumotlar qatori topilmadi. Kamida 1 ta sarlavha va 1 ta talaba qatori bo'lishi kerak.",
    })
    return result
  }

  // Header mapping
  const rawHeaders = parseCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/["'\s_]/g, ''),
  )

  let firstNameIdx = -1
  let lastNameIdx = -1
  let phoneIdx = -1
  let birthDateIdx = -1
  let genderIdx = -1
  let statusIdx = -1
  let notesIdx = -1

  rawHeaders.forEach((h, idx) => {
    if (h.includes('ism') || h.includes('firstname') || h === 'name' || h.includes('first')) {
      if (firstNameIdx === -1) firstNameIdx = idx
    } else if (h.includes('familiya') || h.includes('lastname') || h.includes('surname') || h.includes('last')) {
      if (lastNameIdx === -1) lastNameIdx = idx
    } else if (h.includes('tel') || h.includes('phone') || h.includes('raqam')) {
      if (phoneIdx === -1) phoneIdx = idx
    } else if (h.includes('tugil') || h.includes('birth') || h.includes('dob') || h.includes('sana')) {
      if (birthDateIdx === -1) birthDateIdx = idx
    } else if (h.includes('jins') || h.includes('gender') || h.includes('sex')) {
      if (genderIdx === -1) genderIdx = idx
    } else if (h.includes('holat') || h.includes('status')) {
      if (statusIdx === -1) statusIdx = idx
    } else if (h.includes('izoh') || h.includes('note') || h.includes('eslatma') || h.includes('comment')) {
      if (notesIdx === -1) notesIdx = idx
    }
  })

  // Fallbacks if columns weren't recognized by name
  if (firstNameIdx === -1 && lastNameIdx === -1) {
    firstNameIdx = 0
    lastNameIdx = 1
    if (rawHeaders.length > 2) phoneIdx = 2
    if (rawHeaders.length > 3) birthDateIdx = 3
  } else if (firstNameIdx === -1) {
    firstNameIdx = 0
  } else if (lastNameIdx === -1) {
    lastNameIdx = firstNameIdx === 0 ? 1 : 0
  }

  result.totalRows = lines.length - 1

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]
    const cells = parseCsvLine(rawLine, delimiter)

    const rawFirstName = cells[firstNameIdx] ?? ''
    const rawLastName = cells[lastNameIdx] ?? ''
    const rawPhone = phoneIdx >= 0 ? cells[phoneIdx] ?? '' : ''
    const rawBirthDate = birthDateIdx >= 0 ? cells[birthDateIdx] ?? '' : ''
    const rawGender = genderIdx >= 0 ? cells[genderIdx] ?? '' : ''
    const rawStatus = statusIdx >= 0 ? cells[statusIdx] ?? '' : ''
    const rawNotes = notesIdx >= 0 ? cells[notesIdx] ?? '' : ''

    const firstName = rawFirstName.replace(/^["']|["']$/g, '').trim()
    const lastName = rawLastName.replace(/^["']|["']$/g, '').trim()

    if (!firstName) {
      result.errors.push({
        rowNumber: i + 1,
        rawText: rawLine,
        reason: "Ism ko'rsatilmagan (majburiy).",
      })
      continue
    }

    // Gender parsing
    let gender: Gender | '' = ''
    const lowerGender = rawGender.toLowerCase()
    if (lowerGender.includes('erkak') || lowerGender.includes('ogil') || lowerGender === 'male' || lowerGender === 'm') {
      gender = 'MALE'
    } else if (lowerGender.includes('ayol') || lowerGender.includes('qiz') || lowerGender === 'female' || lowerGender === 'f') {
      gender = 'FEMALE'
    } else if (lowerGender.includes('boshqa') || lowerGender === 'other') {
      gender = 'OTHER'
    }

    // Status parsing
    let status: StudentStatus = 'ACTIVE'
    const upperStatus = rawStatus.toUpperCase()
    if (upperStatus.includes('INACTIVE') || upperStatus.includes('NOFAOL') || upperStatus.includes('TUXTATILGAN')) {
      status = 'INACTIVE'
    } else if (upperStatus.includes('FROZEN') || upperStatus.includes('MUZL')) {
      status = 'FROZEN'
    } else if (upperStatus.includes('GRADUAT') || upperStatus.includes('BITIR')) {
      status = 'GRADUATED'
    } else if (upperStatus.includes('LEFT') || upperStatus.includes('KETGAN')) {
      status = 'LEFT'
    }

    // Birth date validation: simple YYYY-MM-DD check or reformat DD.MM.YYYY
    let formattedBirthDate = ''
    if (rawBirthDate) {
      const trimmedDate = rawBirthDate.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        formattedBirthDate = trimmedDate
      } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmedDate)) {
        const parts = trimmedDate.split('.')
        formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedDate)) {
        const parts = trimmedDate.split('/')
        formattedBirthDate = `${parts[2]}-${parts[0]}-${parts[1]}`
      }
    }

    const studentInput: StudentUpsertInput = {
      first_name: firstName,
      last_name: lastName,
      phone: normalizePhone(rawPhone),
      birth_date: formattedBirthDate,
      gender,
      status,
      notes: rawNotes.replace(/^["']|["']$/g, '').trim(),
    }

    result.validStudents.push(studentInput)
  }

  return result
}

/**
 * Exports Debtors list to CSV.
 */
export function exportDebtorsToCsv(debtors: DebtSummary[], filename = 'qarzdorlar-royxati'): void {
  const headers = [
    "O'quvchi F.I.Sh",
    'Guruh',
    'Telefon',
    'Jami qarz (so‘m)',
    "Kutilayotgan summa",
    "Muddati o'tgan summa",
    "Kechikish (kun)",
    'Holati',
    "Oxirgi to'lov sanasi",
  ]

  const rows = debtors.map((d) => [
    escapeCsvValue(d.student_name),
    escapeCsvValue(d.group_name ?? "Guruh yo'q"),
    escapeCsvValue(d.phone ?? ''),
    escapeCsvValue(d.total_debt),
    escapeCsvValue(d.pending_amount),
    escapeCsvValue(d.overdue_amount),
    escapeCsvValue(d.days_overdue),
    escapeCsvValue(d.status),
    escapeCsvValue(d.last_payment_date ?? ''),
  ].join(','))

  const csvContent = [headers.map(escapeCsvValue).join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadCsv(`${filename}-${dateStr}.csv`, csvContent)
}

/**
 * Exports Payments list to CSV.
 */
export function exportPaymentsToCsv(payments: PaymentRecord[], filename = 'tolovlar-tarixi'): void {
  const headers = [
    'Kvitansiya №',
    "O'quvchi F.I.Sh",
    'Guruh',
    'Telefon',
    'Summa (so‘m)',
    'To‘lov usuli',
    'Holati',
    'To‘lov sanasi',
    'Yaratilgan vaqti',
  ]

  const rows = payments.map((p) => {
    const studentName = p.student ? `${p.student.first_name} ${p.student.last_name}`.trim() : "Noma'lum"
    return [
      escapeCsvValue(p.receipt_number),
      escapeCsvValue(studentName),
      escapeCsvValue(p.student?.group_name ?? ''),
      escapeCsvValue(p.student?.phone ?? ''),
      escapeCsvValue(p.amount),
      escapeCsvValue(p.method),
      escapeCsvValue(p.status),
      escapeCsvValue(p.payment_date ?? ''),
      escapeCsvValue(p.created_at.slice(0, 19).replace('T', ' ')),
    ].join(',')
  })

  const csvContent = [headers.map(escapeCsvValue).join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadCsv(`${filename}-${dateStr}.csv`, csvContent)
}
