import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('rounded-sm text-base font-bold tracking-[0.08em] uppercase outline-none focus-visible:ring-[3px] focus-visible:ring-ring', className)}
      aria-label="Kurio, página inicial"
    >
      Kurio
    </Link>
  )
}
