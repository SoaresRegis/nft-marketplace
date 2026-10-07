import { Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { useEffect } from 'react'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from '@/features/catalog/nft-card'
import { nftDetailQuery } from '@/features/catalog/queries'
import { useFavorites } from '@/features/nft/use-favorites'

export function FavoritesPage() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const details = useQueries({ queries: ids.map((id) => nftDetailQuery(id)) })
  useEffect(() => {
    document.title = 'Favoritos | Kurio'
  }, [])

  if (favorites.isPending) return <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <li key={i}><NftCardSkeleton /></li>)}</ul>
  if (favorites.isError) return <ErrorState message={favorites.error.message} onRetry={() => void favorites.refetch()} retrying={favorites.isFetching} />
  if (!ids.length) {
    return <EmptyState icon={<Heart className="size-10 text-muted-foreground" aria-hidden="true" />} title="Nenhum favorito ainda" message="Toque no coração de um NFT para salvá-lo aqui." action={<Button asChild><Link to="/">Explorar NFTs</Link></Button>} />
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="favorites-grid">
      {details.map((d, i) => (
        <li key={ids[i]}>{d.data ? <NftCard nft={d.data} /> : <NftCardSkeleton />}</li>
      ))}
    </ul>
  )
}
