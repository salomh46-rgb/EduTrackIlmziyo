import { Loader2 } from 'lucide-react'
import { StateScreen } from '@/components/StateScreen'

type LoadingStateProps = {
  title: string
  description: string
}

export function LoadingState({ title, description }: LoadingStateProps) {
  return (
    <StateScreen
      icon={<Loader2 className="h-12 w-12 animate-spin" />}
      title={title}
      description={description}
    />
  )
}
