import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type PageContainerProps = HTMLAttributes<HTMLDivElement>

export function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  )
}
