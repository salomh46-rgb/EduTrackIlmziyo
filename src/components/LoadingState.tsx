import { Loader2 } from 'lucide-react'
import { StateScreen } from '@/components/StateScreen'

type LoadingStateProps = {
  title?: string
  description?: string
  message?: string
  label?: string
}

export function LoadingState({ title, description, message, label }: LoadingStateProps) {
  return (
    <StateScreen
      icon={<Loader2 className="h-12 w-12 animate-spin" />}
      title={title ?? label ?? message ?? 'Yuklanmoqda...'}
      description={description ?? (message && title ? message : 'Iltimos, kuting...')}
    />
  )
}
