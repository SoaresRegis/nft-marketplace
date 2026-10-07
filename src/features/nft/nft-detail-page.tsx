import { Link, getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Mail, Search, ShoppingCart, Star } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Edition, NftDetail } from '@/api/contracts'
import { ApiError } from '@/api/errors'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Breadcrumbs, MARKET_CRUMBS } from '@/components/common/breadcrumbs'
import { BrandIcon, brandPath } from '@/components/common/social-icons'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useAddToCart, useCart } from '@/features/cart/use-cart'
import { NftCarousel } from '@/features/catalog/nft-carousel'
import { nftDetailQuery, nftListQuery } from '@/features/catalog/queries'
import { CATEGORY_LABELS, CHAIN_LABELS } from '@/features/catalog/search'
import { formatEth, formatEthFull, mul } from '@/lib/money'
import { useBottomBarOffset, useIsMobile } from '@/lib/use-media-query'
import { cn, shortAddress } from '@/lib/utils'
import { BackButton, roundButtonClass } from '@/components/layout/mobile-bars'
import { FavoriteButton } from './favorite-button'
import { QuantityStepper } from './quantity-stepper'

const route = getRouteApi('/nft/$nftId')

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const query = useQuery(nftDetailQuery(nftId))

  useEffect(() => {
    if (query.data) document.title = `${query.data.name} | Kurio`
  }, [query.data])

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') {
      return (
        <div className="container-page py-20">
          <EmptyState
            title="NFT não encontrado"
            message="O NFT que você procura não existe ou foi removido do catálogo."
            action={
              <Button asChild variant="outline">
                <Link to="/">Voltar ao marketplace</Link>
              </Button>
            }
          />
        </div>
      )
    }
    return (
      <div className="container-page py-20">
        <ErrorState title="Não foi possível carregar o NFT" message={query.error.message} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </div>
    )
  }
  return <DetailContent nft={query.data} refreshing={query.isFetching} />
}

function DetailContent({ nft, refreshing }: { nft: NftDetail; refreshing: boolean }) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileDetail nft={nft} refreshing={refreshing} />
  return (
    <article aria-labelledby="nft-title" className="container-page flex flex-col gap-16 pt-6 pb-16 lg:gap-24 lg:pb-24">
      <div className="flex flex-col gap-3">
        <Breadcrumbs items={MARKET_CRUMBS} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,572px)_minmax(0,1fr)] lg:gap-[33px]">
          <Gallery nft={nft} />
          <div className="flex min-w-0 flex-col gap-3">
            <h1 id="nft-title" className="text-[26px] leading-tight font-bold lg:text-[28px]">
              {nft.name}
            </h1>
            <PurchasePanel nft={nft} refreshing={refreshing} />
          </div>
        </div>
      </div>
      <DetailTabs nft={nft} />
      <MoreFromCollection nft={nft} />
    </article>
  )
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5 text-highlight', className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('size-3.5', i <= Math.round(value) ? 'fill-current' : 'opacity-40')} strokeWidth={1.5} />
      ))}
    </span>
  )
}

function Gallery({ nft }: { nft: NftDetail }) {
  const { gallery } = nft
  const [active, setActive] = useState(0)
  const image = gallery[active] ?? gallery[0]
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (i + delta + gallery.length) % gallery.length
    setActive(next)
    refs.current[next]?.focus()
  }
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 md:grid-cols-[100px_minmax(0,1fr)] md:gap-7">
      <div role="tablist" aria-label="Galeria de imagens" aria-orientation="vertical" className="flex flex-col gap-4">
        {gallery.map((g, i) => (
          <button
            key={g.src + i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            aria-label={`Imagem ${i + 1} de ${gallery.length}: ${g.alt}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'aspect-square overflow-hidden rounded-sm outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring',
              i === active ? 'ring-2 ring-primary' : 'opacity-75 hover:opacity-100',
            )}
          >
            <img src={g.src} alt="" width={100} height={100} loading="lazy" className="size-full object-cover" />
          </button>
        ))}
      </div>
      <div className="relative self-start bg-card p-4 md:p-5">
        <img
          src={image.src}
          alt={image.alt}
          width={404}
          height={404}
          fetchPriority="high"
          decoding="async"
          className="aspect-square w-full rounded-2xl object-cover"
          data-testid="gallery-main"
        />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-background/80 text-foreground outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[min(92vw,880px)] p-3">
            <DialogTitle className="sr-only">{image.alt}</DialogTitle>
            <DialogDescription className="sr-only">Arte ampliada</DialogDescription>
            <img src={image.src} alt={image.alt} className="w-full rounded-xl" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function EditionChips({ editions, selectedId, onSelect, mobile = false }: { editions: Edition[]; selectedId?: string; onSelect: (id: string) => void; mobile?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Edição" className={cn('flex flex-wrap', mobile ? 'gap-3' : 'gap-2')}>
      {editions.map((e) => {
        const selected = e.id === selectedId
        const soldOut = e.available === 0
        return (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${e.name}, tiragem de ${e.supply}, ${formatEth(e.priceEth)}${soldOut ? ', esgotada' : ''}`}
            onClick={() => onSelect(e.id)}
            className={cn(
              'rounded-full border outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring',
              mobile ? 'px-2 py-0.5 text-[14px] tracking-[0.04em]' : 'px-2.5 py-0.5 text-[13px]',
              selected ? 'border-primary text-highlight' : mobile ? 'border-line-soft text-caption hover:border-caption' : 'border-border text-caption hover:border-caption',
              soldOut && 'line-through opacity-60',
            )}
            data-testid={`edition-${e.id}`}
          >
            1/{e.supply}
          </button>
        )
      })}
    </div>
  )
}

function usePurchase(nft: NftDetail) {
  const { edition: editionParam } = route.useSearch()
  const navigate = route.useNavigate()
  const cart = useCart()
  const add = useAddToCart()
  const uid = useId()

  const requested = editionParam ? nft.editions.find((e) => e.id === editionParam) : undefined
  const firstAvailable = nft.editions.find((e) => e.available > 0)
  const invalidParam = !!editionParam && !requested
  const edition: Edition | undefined = requested ?? firstAvailable ?? nft.editions[0]
  const unavailable = !edition || edition.available === 0
  const inCart = cart.data?.items.find((i) => i.editionId === edition?.id)?.quantity ?? 0
  const limit = edition ? Math.max(0, Math.min(edition.available, edition.maxPerOrder) - inCart) : 0
  const [qty, setQty] = useState(1)
  const quantity = Math.max(1, Math.min(qty, Math.max(limit, 1)))

  useEffect(() => {
    if (limit > 0 && qty > limit) setQty(limit)
  }, [limit, qty])

  const total = useMemo(() => (edition ? mul(edition.priceEth, quantity) : '0'), [edition, quantity])
  const selectEdition = (id: string) => {
    setQty(1)
    add.reset()
    void navigate({ search: { edition: id }, replace: true, resetScroll: false })
  }

  const submit = async () => {
    if (!edition || unavailable || limit === 0) return
    try {
      await add.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity, label: `${nft.name} (${edition.name})` })
      setQty(1)
    } catch {
    }
  }

  return { edition, editionList: nft.editions, invalidParam, unavailable, inCart, limit, quantity, setQty, total, selectEdition, submit, add, uid }
}

function PurchasePanel({ nft, refreshing }: { nft: NftDetail; refreshing: boolean }) {
  const { edition, invalidParam, unavailable, inCart, limit, quantity, setQty, total, selectEdition, submit, add, uid } = usePurchase(nft)
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `${nft.name} na Kurio`
  const facts = [
    ['ID do token', `#${nft.tokenId}`],
    ['Coleção', nft.collection],
    ['Atributos', nft.attributes.join(', ')],
  ] as const

  return (
    <section aria-label="Comprar" className="flex flex-col gap-4" data-testid="purchase-panel">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <p className="text-xl font-bold text-highlight tabular" title={edition ? formatEthFull(edition.priceEth) : undefined}>
          <span className="sr-only">Preço: </span>
          {edition ? formatEth(edition.priceEth) : formatEth(nft.priceEth)}
        </p>
        <a href="#avaliacoes" className="flex items-center gap-2 rounded-sm text-[15px] outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring">
          <Stars value={nft.rating.average} />
          <span>
            <span className="sr-only">Nota {nft.rating.average.toLocaleString('pt-BR')} de 5, </span>
            {nft.rating.count} avaliações de colecionadores
          </span>
        </a>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[15px] font-bold">Sobre este NFT:</h2>
        <p className="text-sm leading-6 text-caption">{nft.description}</p>
      </div>

      {invalidParam && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Edição indisponível</AlertTitle>
          <AlertDescription>A edição solicitada não existe para este NFT. Mostrando a primeira edição disponível.</AlertDescription>
        </Alert>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-bold">Edição:</legend>
        <EditionChips editions={nft.editions} selectedId={edition?.id} onSelect={selectEdition} />
        {edition && (
          <p className="text-[13px] text-caption" data-testid="edition-availability">
            {edition.name}: {edition.available === 0 ? 'esgotada' : `${edition.available} de ${edition.supply} disponíveis`}
          </p>
        )}
      </fieldset>

      {edition && (
        <>
          {unavailable ? (
            <Alert variant="destructive" data-testid="edition-unavailable">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Edição esgotada</AlertTitle>
              <AlertDescription>Escolha outra edição ou favorite este NFT para acompanhar.</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <QuantityStepper
                label="Quantidade"
                variant="pill"
                value={quantity}
                max={Math.max(limit, 1)}
                onChange={(n) => {
                  add.reset()
                  setQty(n)
                }}
                disabled={unavailable || limit === 0}
                describedBy={`${uid}-limit`}
              />
              <span className="text-sm text-caption">
                Total: <span className="font-bold text-foreground tabular" data-testid="detail-total" title={formatEthFull(total)}>{formatEth(total)}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                className="h-9 rounded-sm px-8 text-[15px] uppercase"
                onClick={() => void submit()}
                disabled={unavailable || limit === 0 || add.isPending}
                data-testid="add-to-cart"
              >
                {add.isPending ? 'Adicionando…' : 'Comprar'}
                <span className="sr-only"> (adiciona ao carrinho)</span>
              </Button>
              <FavoriteButton nftId={nft.id} name={nft.name} withLabel testId="detail-favorite" />
            </div>
          </div>
          {!unavailable && (
            <p id={`${uid}-limit`} className="-mt-2 text-[13px] text-caption" data-testid="quantity-limit">
              {limit === 0
                ? `Você já tem o máximo permitido desta edição no carrinho (${inCart}).`
                : `Limite de ${Math.min(edition.available, edition.maxPerOrder)} por pedido${inCart ? `, ${inCart} já no carrinho` : ''}.`}
            </p>
          )}

          {add.isError && (
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Não foi possível adicionar</AlertTitle>
              <AlertDescription>{add.error.message}</AlertDescription>
            </Alert>
          )}
          {refreshing && <Badge variant="secondary" className="self-start">Atualizando preço…</Badge>}
        </>
      )}

      <dl className="flex flex-col gap-2 text-[15px] text-caption">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="inline">{k}: </dt>
            <dd className="inline">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-bold">Compartilhar este NFT:</span>
        <ul className="flex items-center gap-1">
          {[
            { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, icon: <BrandIcon path={brandPath('LinkedIn')} className="size-[18px]" /> },
            { label: 'e-mail', href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`, icon: <Mail className="size-[18px]" aria-hidden="true" /> },
            { label: 'X (Twitter)', href: `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, icon: <BrandIcon path={brandPath('X')} className="size-[18px]" /> },
          ].map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target={s.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="grid size-8 place-items-center rounded-sm outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                {s.icon}
                <span className="sr-only">Compartilhar por {s.label}{s.href.startsWith('mailto') ? '' : ' (abre em nova aba)'}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DetailTabs({ nft }: { nft: NftDetail }) {
  const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })
  return (
    <Tabs defaultValue="details" id="avaliacoes" className="scroll-mt-28 gap-4">
      <TabsList className="flex-wrap justify-start gap-x-9 gap-y-2 border-border">
        <TabsTrigger value="details" className="flex-none px-0 pt-0 pb-1.5 text-left text-base md:text-lg font-medium text-foreground data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-highlight">
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex-none px-0 pt-0 pb-1.5 text-left text-base md:text-lg font-medium text-foreground data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-highlight">
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="flex flex-col gap-4 text-sm leading-6 text-caption">
        <p>{nft.description}</p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência na rede. {nft.creator.name} recebe{' '}
          {nft.royaltyPercent.toLocaleString('pt-BR')}% de direitos autorais nas vendas secundárias.
        </p>
        <dl className="flex flex-col gap-3">
          {[
            ['Rede', `Cunhado na ${CHAIN_LABELS[nft.chain]} em ${dateFmt.format(new Date(nft.createdAt))}, com procedência imutável e metadados armazenados no IPFS.`],
            ['Contrato', `${shortAddress(nft.contractAddress)} · Contrato inteligente ${nft.tokenStandard} verificado.`],
            ['Direitos autorais', `Direitos autorais do criador: ${nft.royaltyPercent.toLocaleString('pt-BR')}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`],
            ['Categoria e tags', `${CATEGORY_LABELS[nft.category]} · ${nft.tags.join(', ')}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-bold text-foreground">{k}:</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </TabsContent>
      <TabsContent value="reviews">
        <p className="mb-4 flex items-center gap-2 text-sm text-caption">
          <Stars value={nft.rating.average} />
          Média {nft.rating.average.toLocaleString('pt-BR')} de 5 em {nft.rating.count} avaliações. Mostrando as mais recentes.
        </p>
        <ul className="flex flex-col divide-y divide-border">
          {nft.reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold">{r.author}</span>
                <Stars value={r.rating} />
                <span className="sr-only">Nota {r.rating} de 5</span>
                <span className="text-xs text-caption">{dateFmt.format(new Date(r.createdAt))}</span>
              </div>
              <p className="text-sm text-caption">{r.text}</p>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  )
}

function MoreFromCollection({ nft }: { nft: NftDetail }) {
  const q = useQuery(nftListQuery({ category: [nft.category], pageSize: 16, sort: 'popular', page: 1 }))
  const items = (q.data?.items ?? []).filter((i) => i.id !== nft.id).slice(0, 15)
  return <NftCarousel id="mais-da-colecao" title="Mais desta coleção" items={items} loading={q.isPending} />
}

function MobileDetail({ nft, refreshing }: { nft: NftDetail; refreshing: boolean }) {
  const p = usePurchase(nft)
  const cart = useCart()
  const count = cart.data?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0
  const barRef = useBottomBarOffset<HTMLDivElement>()
  const { edition } = p
  return (
    <article aria-labelledby="nft-title" className="flex flex-col pb-bottom-bar">
      <div className="bg-[linear-gradient(140deg,#2f1d15_0%,#140d0a_70%)]">
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <BackButton />
          <FavoriteButton nftId={nft.id} name={nft.name} testId="detail-favorite" className={cn(roundButtonClass, 'size-[34px] bg-surface-2 backdrop-blur-none [&_svg]:size-4 [&_svg:not(.fill-primary)]:text-highlight')} />
        </div>
        <MobileGallery nft={nft} />
      </div>

      <section aria-label="Comprar" data-testid="purchase-panel" className="relative -mt-8 flex flex-col gap-4 rounded-t-[30px] bg-card px-6 pt-8 pb-8">
        <div className="flex items-start justify-between gap-3">
          <h1 id="nft-title" className="min-w-0 text-[19px] leading-tight font-bold tracking-[0.04em]">
            {nft.name}
          </h1>
          <a
            href="#avaliacoes"
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-[13px] tabular outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Star className="size-3.5 fill-highlight text-highlight" aria-hidden="true" />
            <span className="sr-only">Nota </span>
            {nft.rating.average.toLocaleString('pt-BR')}
            <span aria-hidden="true">({nft.rating.count})</span>
            <span className="sr-only">de 5, {nft.rating.count} avaliações</span>
          </a>
        </div>
        <p className="line-clamp-3 text-[14px] leading-6 tracking-[0.02em] text-caption">{nft.description}</p>

        {p.invalidParam && (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Edição indisponível</AlertTitle>
            <AlertDescription>A edição solicitada não existe para este NFT. Mostrando a primeira edição disponível.</AlertDescription>
          </Alert>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-bold">Edição:</legend>
          <EditionChips editions={nft.editions} selectedId={edition?.id} onSelect={p.selectEdition} mobile />
          {edition && (
            <p className="text-[13px] text-caption" data-testid="edition-availability">
              {edition.name}: {edition.available === 0 ? 'esgotada' : `${edition.available} de ${edition.supply} disponíveis`}
            </p>
          )}
        </fieldset>

        {edition && p.unavailable && (
          <Alert variant="destructive" data-testid="edition-unavailable">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Edição esgotada</AlertTitle>
            <AlertDescription>Escolha outra edição ou favorite este NFT para acompanhar.</AlertDescription>
          </Alert>
        )}

        <dl className="flex flex-col gap-3 text-[14px] tracking-[0.03em] text-caption">
          {(
            [
              ['ID do token', `#${nft.tokenId}`],
              ['Coleção', nft.collection],
              ['Atributos', nft.attributes.join(', ')],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="inline">{k}: </dt>
              <dd className="inline">{v}</dd>
            </div>
          ))}
        </dl>
        {edition && !p.unavailable && (
          <p id={`${p.uid}-limit`} className="text-[13px] text-caption" data-testid="quantity-limit">
            {p.limit === 0
              ? `Você já tem o máximo permitido desta edição no carrinho (${p.inCart}).`
              : `Limite de ${Math.min(edition.available, edition.maxPerOrder)} por pedido${p.inCart ? `, ${p.inCart} já no carrinho` : ''}.`}
          </p>
        )}
        {p.add.isError && (
          <Alert variant="destructive" role="alert">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Não foi possível adicionar</AlertTitle>
            <AlertDescription>{p.add.error.message}</AlertDescription>
          </Alert>
        )}
        {refreshing && <Badge variant="secondary" className="self-start">Atualizando preço…</Badge>}
      </section>

      <div className="container-page flex flex-col gap-12 pt-4 pb-10">
        <DetailTabs nft={nft} />
        <MoreFromCollection nft={nft} />
      </div>

      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40 rounded-t-[30px] bg-surface-2 px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold tracking-[0.04em]" aria-hidden="true">
              Qtd.
            </span>
            <QuantityStepper
              label="Quantidade"
              variant="pill"
              size="sm"
              value={p.quantity}
              max={Math.max(p.limit, 1)}
              onChange={(n) => {
                p.add.reset()
                p.setQty(n)
              }}
              disabled={!edition || p.unavailable || p.limit === 0}
              describedBy={`${p.uid}-limit`}
            />
          </div>
          <p className="text-[19px] font-bold text-highlight tabular">
            <span className="sr-only">Total: </span>
            <span data-testid="detail-total" title={formatEthFull(p.total)}>
              {formatEth(p.total)}
            </span>
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            className="h-[60px] flex-1 rounded-full bg-pill-gradient text-[15px] font-bold tracking-[0.04em] text-primary-foreground hover:opacity-90"
            onClick={() => void p.submit()}
            disabled={!edition || p.unavailable || p.limit === 0 || p.add.isPending}
            data-testid="add-to-cart"
          >
            {p.add.isPending ? 'Adicionando…' : 'Comprar NFT'}
            <span className="sr-only"> (adiciona ao carrinho)</span>
          </Button>
          <Link
            to="/cart"
            aria-label={`Ver carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            className="relative grid size-[60px] shrink-0 place-items-center rounded-full border border-line-soft bg-card text-highlight outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute top-2 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground" data-testid="cart-count">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </article>
  )
}

function MobileGallery({ nft }: { nft: NftDetail }) {
  const { gallery } = nft
  const [active, setActive] = useState(0)
  const image = gallery[active] ?? gallery[0]
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const startX = useRef<number | null>(null)
  const go = (next: number) => setActive((next + gallery.length) % gallery.length)
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (i + delta + gallery.length) % gallery.length
    setActive(next)
    refs.current[next]?.focus()
  }
  return (
    <div
      className="relative mx-7"
      onPointerDown={(e) => {
        startX.current = e.clientX
      }}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1))
      }}
    >
      <img
        src={image.src}
        alt={image.alt}
        width={360}
        height={360}
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="aspect-square w-full touch-pan-y rounded-[24px] object-cover select-none"
        data-testid="gallery-main"
      />
      {gallery.length > 1 && (
        <div role="tablist" aria-label="Galeria de imagens" className="absolute inset-x-0 bottom-10 flex justify-center">
          {gallery.map((g, i) => (
            <button
              key={g.src + i}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              aria-label={`Imagem ${i + 1} de ${gallery.length}: ${g.alt}`}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                'grid size-6 place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                'before:block before:size-[7px] before:rounded-full before:transition-colors',
                i === active ? 'before:bg-primary' : 'before:bg-foreground/70',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT" data-testid="detail-skeleton" className="container-page pt-6 pb-16">
      <Skeleton className="mb-3 h-5 w-40" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,572px)_minmax(0,1fr)] lg:gap-[33px]">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 md:grid-cols-[100px_minmax(0,1fr)] md:gap-7">
          <div className="flex flex-col gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square" />)}</div>
          <Skeleton className="aspect-square rounded-none" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-6 w-full" />
          <div className="flex flex-col gap-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
