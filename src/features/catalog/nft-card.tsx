import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/features/nft/favorite-button'
import { formatEth, formatEthFull } from '@/lib/money'

const RARE_THRESHOLD = 3

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const soldOut = nft.available === 0
  return (
    <article className="group relative flex flex-col" data-testid="nft-card">
      <div className="relative flex aspect-[258/300] items-center bg-card p-1 max-md:aspect-auto max-md:rounded-[20px] max-md:bg-card-gradient max-md:pt-3 max-md:pb-5">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl max-md:rounded-2xl">
          <img
            src={nft.image}
            alt={`Arte do NFT ${nft.name}`}
            width={250}
            height={250}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-60 grayscale-[40%]' : ''}`}
          />
          {soldOut ? (
            <span className="absolute top-3 left-3 rounded-sm bg-background/90 px-2.5 py-1 text-xs font-bold tracking-wide text-highlight uppercase">Esgotado</span>
          ) : (
            nft.available <= RARE_THRESHOLD && (             
              <span className="absolute top-0 left-0 bg-primary px-2 py-1 text-[13px] tracking-wide text-primary-foreground uppercase md:hidden">
                Raro<span className="sr-only">: poucas edições disponíveis</span>
              </span>
            )
          )}
        </div>
        <FavoriteButton
          nftId={nft.id}
          name={nft.name}
          className="absolute top-3 right-3 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100 max-lg:opacity-100 max-md:top-4 max-md:right-2.5 max-md:size-7 max-md:bg-surface-2/90 max-md:[&_svg]:size-4"
        />
      </div>
      <h3 className="mt-5 truncate text-base max-md:mt-3 max-md:px-2 max-md:text-[15px] max-md:tracking-[0.04em]">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          search={{ edition: undefined }}
          className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 text-lg tabular max-md:mt-0.5 max-md:px-2 max-md:text-[15px]">
        <span className="sr-only">Preço: </span>
        <span className="font-bold text-highlight" title={formatEthFull(nft.priceEth)} data-testid="nft-card-price">
          {formatEth(nft.priceEth)}
        </span>
        {nft.compareAtPriceEth && (
          <>
            <span className="sr-only">, antes </span>
            <s className="text-strike" data-testid="nft-card-compare">{formatEth(nft.compareAtPriceEth)}</s>
          </>
        )}
      </p>
      <p className="sr-only" data-testid="nft-card-available">
        {soldOut ? '0' : nft.available} {nft.available === 1 ? 'disponível' : 'disponíveis'}
      </p>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col" data-testid="nft-card-skeleton">
      <div className="flex aspect-[258/300] items-center bg-card p-1 max-md:aspect-auto max-md:rounded-[20px] max-md:pt-3 max-md:pb-5">
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-5 w-3/4" />
      <Skeleton className="mt-2 h-6 w-1/3" />
    </div>
  )
}
