import { cn } from '@/lib/utils'

/** Skeleton com shimmer (desligado em prefers-reduced-motion, ver index.css). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('skeleton rounded-md', className)} {...props} />
}

export { Skeleton }
