import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { featuredQuery } from './queries'

export function FeaturedOffer({ className }: { className?: string }) {
  const featured = useQuery(featuredQuery())
  const items = featured.data?.items ?? []
  const nft = items.find((n) => n.compareAtPriceEth) ?? items[2] ?? items[0]
  if (featured.isSuccess && !nft) return null

  return (
    <section aria-labelledby="offer-heading" className={cn('flex flex-col', className)}>
      <div className="bg-gradient-to-b from-[#2b1d12] to-[#1c120c] px-5 pt-5 pb-12 text-center">
        <h2 id="offer-heading" className="text-2xl font-bold text-highlight uppercase">NFT em destaque</h2>
        <p className="mt-2 text-xl font-bold uppercase">Oferta limitada</p>
      </div>
      {nft ? (
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          search={{ edition: undefined }}
          className="group -mt-9 block overflow-hidden rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <img
            src={nft.gallery[0]?.src ?? nft.image}
            alt={`${nft.name} em oferta`}
            width={310}
            height={366}
            loading="lazy"
            decoding="async"
            className="aspect-[310/366] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="sr-only">
            {nft.name} por {formatEth(nft.priceEth)}
            {nft.compareAtPriceEth ? `, antes ${formatEth(nft.compareAtPriceEth)}` : ''}
          </span>
        </Link>
      ) : (
        <Skeleton className="-mt-9 aspect-[310/366] rounded-2xl" />
      )}
    </section>
  )
}
