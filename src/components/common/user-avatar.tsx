import type { User } from '@/api/contracts'
import { cn } from '@/lib/utils'

export function UserAvatar({ user, size = 40, className }: { user: Pick<User, 'name' | 'avatarUrl'>; size?: number; className?: string }) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" width={size} height={size} className={cn('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  }
  return (
    <span
      aria-hidden="true"
      className={cn('grid shrink-0 place-items-center rounded-full bg-hero-gradient font-mono font-bold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}
