import { useLocation, useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'
import { useFavorites, useToggleFavorite } from './use-favorites'

export function FavoriteButton({ nftId, name, className, withLabel = false, testId = 'favorite-button' }: { nftId: string; name: string; className?: string; withLabel?: boolean; testId?: string }) {
  const session = useSession()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const location = useLocation()
  const active = favorites.data?.nftIds.includes(nftId) ?? false

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (session.status !== 'authenticated') {
      void navigate({ to: '/login', search: { redirect: location.href } })
      return
    }
    toggle.mutate({ nftId, name, favorite: !active })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={withLabel ? undefined : active ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-2 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring',
        withLabel ? 'h-9 rounded-sm border border-primary px-3 text-[15px] font-medium text-highlight hover:bg-primary/10' : 'size-10 justify-center rounded-full bg-background/80 backdrop-blur hover:bg-background',
        className,
      )}
    >
      <Heart className={cn('size-5 transition-colors', active ? 'fill-primary text-primary' : withLabel ? 'text-highlight' : 'text-foreground')} aria-hidden="true" />
      {withLabel && <span>{active ? 'Favoritado' : 'Favoritar'}</span>}
    </button>
  )
}
