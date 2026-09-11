import { useState, useRef } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import {
  downloadSampleStudentCsv,
  parseStudentsFromCsv,
  type StudentCsvParseResult,
} from '@/features/students/utils/studentCsvHelper'
import type { StudentUpsertInput } from '@/features/students/types'
import { createStudent } from '@/features/students/api/studentsApi'

type StudentImportModalProps = {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  actorProfileId: string
  onSuccess: () => void
}

export function StudentImportModal({
  isOpen,
  onClose,
  organizationId,
  actorProfileId,
  onSuccess,
}: StudentImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<StudentCsvParseResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  if (!isOpen) return null

  const resetState = () => {
    setSelectedFile(null)
    setParseResult(null)
    setIsProcessing(false)
    setImportProgress(null)
    setImportSuccessCount(null)
    setErrorMessage(null)
  }

  const handleClose = () => {
    if (isProcessing) return
    resetState()
    onClose()
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setErrorMessage("Iltimos, faqat .csv yoki .txt formatidagi faylni tanlang.")
      return
    }

    setSelectedFile(file)
    setErrorMessage(null)
    setImportSuccessCount(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseStudentsFromCsv(text)
        setParseResult(parsed)
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Faylni tahlil qilishda kutilmagan xatolik yuz berdi.",
        )
      }
    }
    reader.onerror = () => {
      setErrorMessage("Faylni o'qishda xatolik yuz berdi.")
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.validStudents.length === 0) return

    setIsProcessing(true)
    setErrorMessage(null)
    setImportProgress({ current: 0, total: parseResult.validStudents.length })

    let successCount = 0
    const failedStudents: string[] = []

    for (let i = 0; i < parseResult.validStudents.length; i++) {
      const student = parseResult.validStudents[i]
      try {
        await createStudent(organizationId, actorProfileId, student)
        successCount++
      } catch (err) {
        failedStudents.push(`${student.first_name} ${student.last_name}`)
      }
      setImportProgress({ current: i + 1, total: parseResult.validStudents.length })
    }

    setIsProcessing(false)
    setImportSuccessCount(successCount)

    if (failedStudents.length > 0) {
      setErrorMessage(
        `${successCount} ta o'quvchi qo'shildi, ammo ${failedStudents.length} tasida xatolik yuz berdi: ${failedStudents.slice(0, 3).join(', ')}...`,
      )
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgb(var(--border))] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-[rgb(var(--text))]">
                Talabalarni CSV / Excel orqali Import Qilish
              </h3>
              <p className="text-xs text-[rgb(var(--muted))]">
                O'quvchilar ro'yxatini jadval orqali ommaviy kiritish
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Yopish"
            className="rounded-xl p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-soft))] hover:text-[rgb(var(--text))] transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success message */}
        {importSuccessCount !== null && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>
                <strong>{importSuccessCount} ta o'quvchi</strong> muvaffaqiyatli tizimga import qilindi!
              </span>
            </div>
            <Button type="button" size="sm" onClick={handleClose}>
              Yopish
            </Button>
          </div>
        )}

        {/* Content Body */}
        {importSuccessCount === null && (
          <div className="mt-5 space-y-4">
            {/* Step 1: Download Template Helper */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/40 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-sky-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-[rgb(var(--text))]">
                    Tayyor andoza shablon kerakmi?
                  </p>
                  <p className="text-[rgb(var(--muted))]">
                    To'g'ri ustunlar bilan to'ldirish uchun namuna faylni yuklab oling.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={downloadSampleStudentCsv}
                className="w-full sm:w-auto shrink-0 rounded-xl"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Namuna shablon (.csv)
              </Button>
            </div>

            {/* Step 2: Upload Zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-[rgb(var(--border))] hover:border-sky-500/50 hover:bg-[rgb(var(--surface-soft))]/40'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[rgb(var(--text))]">
                  {selectedFile ? selectedFile.name : 'CSV faylni bu yerga tashlang yoki tanlang'}
                </p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  Excel dan eksport qilingan (.csv) yoki matnli (.txt) fayllar qabul qilinadi
                </p>
              </div>
            </div>

            {/* Step 3: Parse Preview */}
            {parseResult && (
              <div className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-soft))]/20 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[rgb(var(--text))]">Tahlil natijasi:</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">
                      {parseResult.validStudents.length} ta tayyor o'quvchi
                    </Badge>
                    {parseResult.errors.length > 0 && (
                      <Badge variant="danger">
                        {parseResult.errors.length} ta xato qator
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Table Preview of first 5 items */}
                {parseResult.validStudents.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-[rgb(var(--surface-soft))] font-bold text-[rgb(var(--muted))] border-b border-[rgb(var(--border))]">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">F.I.Sh</th>
                          <th className="px-3 py-2">Telefon</th>
                          <th className="px-3 py-2">Tug'ilgan sana</th>
                          <th className="px-3 py-2">Jinsi</th>
                          <th className="px-3 py-2">Holati</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(var(--border))] text-[rgb(var(--text))]">
                        {parseResult.validStudents.slice(0, 10).map((st, i) => (
                          <tr key={i} className="hover:bg-[rgb(var(--surface-soft))]/40">
                            <td className="px-3 py-2 text-[rgb(var(--muted))] font-mono">{i + 1}</td>
                            <td className="px-3 py-2 font-bold">
                              {st.first_name} {st.last_name}
                            </td>
                            <td className="px-3 py-2 text-[rgb(var(--muted))]">
                              {st.phone || '—'}
                            </td>
                            <td className="px-3 py-2 text-[rgb(var(--muted))]">
                              {st.birth_date || '—'}
                            </td>
                            <td className="px-3 py-2">{st.gender || '—'}</td>
                            <td className="px-3 py-2">
                              <span className="text-emerald-400 font-bold">{st.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parseResult.validStudents.length > 10 && (
                      <div className="p-2 text-center text-[11px] text-[rgb(var(--muted))] bg-[rgb(var(--surface-soft))]/30">
                        ...va yana {parseResult.validStudents.length - 10} ta o'quvchi
                      </div>
                    )}
                  </div>
                )}

                {/* Errors display */}
                {parseResult.errors.length > 0 && (
                  <div className="space-y-1 text-[11px] text-rose-400 max-h-24 overflow-y-auto">
                    {parseResult.errors.map((err, idx) => (
                      <div key={idx}>
                        Qator {err.rowNumber}: {err.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Progress bar during upload */}
            {isProcessing && importProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[rgb(var(--text))]">
                  <span>O'quvchilar saqlanmoqda...</span>
                  <span>
                    {importProgress.current} / {importProgress.total} (
                    {Math.round((importProgress.current / importProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--surface-soft))]">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-200"
                    style={{
                      width: `${(importProgress.current / importProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {importSuccessCount === null && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[rgb(var(--border))] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={
                !parseResult ||
                parseResult.validStudents.length === 0 ||
                isProcessing
              }
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-lg shadow-sky-500/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import qilinmoqda...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {parseResult?.validStudents.length
                    ? `${parseResult.validStudents.length} ta o'quvchini yuklash`
                    : "Import qilish"}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
