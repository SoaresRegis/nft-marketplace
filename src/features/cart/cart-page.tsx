import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { CartItem } from '@/api/contracts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Breadcrumbs, MARKET_CRUMBS } from '@/components/common/breadcrumbs'
import { NftCarousel } from '@/features/catalog/nft-carousel'
import { nftListQuery } from '@/features/catalog/queries'
import { QuantityStepper } from '@/features/nft/quantity-stepper'
import { MobileTopBar } from '@/components/layout/mobile-bars'
import { formatEth, formatEthFull, mul } from '@/lib/money'
import { useIsMobile } from '@/lib/use-media-query'
import { SummaryCard, SummaryRows, SummarySkeleton } from './order-summary'
import { useAcknowledgeCart, useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartQuantity } from './use-cart'
import { useQuote } from './use-quote'

export function CartPage() {
  const cart = useCart()
  const quote = useQuote('ethereum')
  const acknowledge = useAcknowledgeCart()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Carrinho | Kurio'
  }, [])

  const items = cart.data?.items ?? []
  const changed = items.filter((i) => i.priceChanged || i.exceedsAvailability)
  const blocked = items.some((i) => i.available === 0 || i.exceedsAvailability)
  const noCart = cart.fetchStatus === 'idle' && !cart.data && !cart.isError

  return (
    <div className="container-page flex flex-col gap-16 pt-6 pb-16 max-md:pt-0 max-md:pb-0 lg:gap-24 lg:pb-24">
      <div className="flex flex-col gap-3">
      <MobileTopBar title="Carrinho de NFTs" />
      <Breadcrumbs items={[...MARKET_CRUMBS, { label: 'Carrinho' }]} className="max-md:hidden" />
      <h1 className="sr-only max-md:hidden">Carrinho</h1>

      {cart.isError && !cart.data ? (
        <ErrorState title="Não foi possível carregar o carrinho" message={cart.error.message} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
      ) : noCart || (cart.data && items.length === 0) ? (
        <EmptyState
          icon={<ShoppingBag className="size-10 text-muted-foreground" aria-hidden="true" />}
          title="Seu carrinho está vazio"
          message="Explore o marketplace e adicione NFTs à sua coleção."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,782px)_minmax(0,332px)] lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5">
            {changed.length > 0 && (
              <Alert variant="warning" data-testid="cart-changes-alert">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Alguns itens mudaram desde que você os adicionou</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <ul className="list-disc pl-5">
                    {changed.map((i) => (
                      <li key={i.id}>
                        {i.name} ({i.editionName}):{' '}
                        {i.available === 0
                          ? 'esgotado'
                          : i.exceedsAvailability
                            ? `restam apenas ${i.available}`
                            : `preço de ${formatEth(i.acknowledgedPriceEth)} para ${formatEth(i.unitPriceEth)}`}
                      </li>
                    ))}
                  </ul>
                  <Button size="xs" variant="outline" className="self-start" onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending}>
                    {acknowledge.isPending ? 'Atualizando…' : 'Aceitar novos valores'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {cart.isPending ? (
              <ul className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando carrinho">
                {[0, 1].map((i) => (
                  <li key={i} className="flex gap-4 rounded-lg bg-card p-4"><Skeleton className="size-24 shrink-0" /><div className="flex flex-1 flex-col gap-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-32" /></div></li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="hidden grid-cols-[minmax(0,1fr)_138px_136px_150px_40px] border-b border-border pb-2 text-[15px] font-bold md:grid" aria-hidden="true">
                  <span>NFTs</span>
                  <span>Preço</span>
                  <span>Edições</span>
                  <span>Total</span>
                  <span />
                </div>
                <ul className="flex flex-col gap-3 max-md:gap-5" aria-label="Itens do carrinho">
                  {items.map((item) => (
                    <CartLine key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            )}
          </div>

          <SummaryCard title="Resumo da carteira" className="max-md:-mx-6 max-md:gap-4 max-md:rounded-t-[30px] max-md:bg-card max-md:px-6 max-md:pt-6 max-md:pb-8 max-md:[&>h2]:sr-only">
            <CouponForm couponCode={cart.data?.couponCode ?? null} />
            {quote.isError && !quote.data ? (
              <ErrorState className="py-6" title="Falha ao calcular" message={quote.error.message} onRetry={() => void quote.refetch()} retrying={quote.isFetching} />
            ) : quote.data ? (
              <>
                <SummaryRows quote={quote.data} updating={quote.isFetching} />
                {quote.data.issues.some((i) => i.type === 'COUPON_EXPIRED' || i.type === 'COUPON_INVALID') && (
                  <p role="alert" className="text-sm text-destructive">{quote.data.issues.find((i) => i.type.startsWith('COUPON'))?.message}</p>
                )}
                <p className="text-xs text-caption">Você poderá escolher outra rede no pagamento.</p>
              </>
            ) : (
              <SummarySkeleton />
            )}
            <div className="flex flex-col items-center gap-3">
              <Button className="h-10 w-full rounded-sm text-[15px] max-md:mt-4 max-md:h-[60px] max-md:rounded-full max-md:bg-pill-gradient max-md:font-bold max-md:tracking-[0.04em]" disabled={!items.length || blocked || cart.isPending} onClick={() => void navigate({ to: '/checkout' })} data-testid="go-to-checkout">
                Conectar e finalizar
              </Button>
              <Link to="/" hash="catalogo" className="rounded-sm text-[15px] text-highlight outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">
                Continuar explorando
              </Link>
            </div>
            {blocked && <p className="text-sm text-warning">Ajuste os itens esgotados ou acima da disponibilidade para continuar.</p>}
          </SummaryCard>
        </div>
      )}
      </div>
      <div className="max-md:hidden">
        <AlsoViewed exclude={items.map((i) => i.nftId)} />
      </div>
    </div>
  )
}

function CartLine({ item }: { item: CartItem }) {
  const update = useUpdateCartQuantity()
  const remove = useRemoveCartItem()
  const isMobile = useIsMobile()
  const label = `${item.name} (${item.editionName})`
  const max = Math.max(1, Math.min(item.maxPerOrder, Math.max(item.available, item.quantity)))
  const soldOut = item.available === 0
  const lineTotal = mul(item.unitPriceEth, item.quantity)
  const badges = (
    <div className="mt-1 flex flex-wrap gap-2 empty:hidden">
      {item.priceChanged && (
        <Badge variant="warning" data-testid="price-changed-badge">
          Preço alterado: <s className="opacity-80">{formatEth(item.acknowledgedPriceEth)}</s> → {formatEth(item.unitPriceEth)}
        </Badge>
      )}
      {soldOut ? <Badge variant="destructive">Esgotado</Badge> : item.exceedsAvailability ? <Badge variant="destructive">Restam apenas {item.available}</Badge> : null}
    </div>
  )

  if (isMobile) {
    // Carrinho mobile (Figma): arte de 100 px, nome, edição, total em laranja e botões redondos.
    return (
      <li className="relative grid min-h-[100px] grid-cols-[100px_minmax(0,1fr)] overflow-hidden rounded-[14px] bg-card" data-testid="cart-item">
        <Link to="/nft/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset">
          <img src={item.image} alt={`Arte do NFT ${item.name}`} width={100} height={100} className="size-full min-h-[100px] rounded-[14px] object-cover" loading="lazy" />
        </Link>
        <div className="flex min-w-0 flex-col justify-center gap-1 py-3 pr-3 pl-2.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 truncate text-[15px] font-bold tracking-[0.03em]">
              <Link to="/nft/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
                {item.name}
              </Link>
            </h2>
            <button
              type="button"
              className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-highlight outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50"
              aria-label={`Remover ${label}`}
              onClick={() => remove.mutate({ itemId: item.id, label })}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-[13px] tracking-[0.03em] text-caption">Edição: {item.editionName}</p>
          {badges}
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[17px] font-bold text-highlight tabular" title={formatEthFull(lineTotal)}>
              <span className="sr-only">Total do item: </span>
              {formatEth(lineTotal, { maxDecimals: 6 })}
            </p>
            <QuantityStepper size="sm" variant="circle" label={`Quantidade de ${label}`} value={item.quantity} max={max} onChange={(quantity) => update.mutate({ itemId: item.id, quantity })} disabled={soldOut} />
          </div>
        </div>
      </li>
    )
  }
  return (
    <li className="grid grid-cols-[70px_minmax(0,1fr)_40px] items-center gap-x-4 gap-y-2 bg-card md:grid-cols-[70px_minmax(0,1fr)_138px_136px_150px_40px]" data-testid="cart-item">
      <Link to="/nft/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="row-span-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:row-span-1">
        <img src={item.image} alt={`Arte do NFT ${item.name}`} width={70} height={70} className="size-[70px] object-cover" loading="lazy" />
      </Link>
      <div className="min-w-0 py-2">
        <h2 className="truncate text-[15px] font-bold">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="rounded-sm outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring">
            {item.name}
          </Link>
        </h2>
        <p className="text-[13px] text-caption">ID do token: #{item.tokenId}</p>
        <p className="text-[13px] text-caption" title={`Máximo ${Math.min(item.maxPerOrder, item.available)} por pedido`}>
          Edição {item.editionName}
        </p>
        {badges}
      </div>
      <p className="col-start-2 text-[15px] text-caption tabular md:col-start-auto" title={formatEthFull(item.unitPriceEth)}>
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPriceEth)}
      </p>
      <div className="col-start-2 md:col-start-auto">
        <QuantityStepper size="sm" variant="pill" label={`Quantidade de ${label}`} value={item.quantity} max={max} onChange={(quantity) => update.mutate({ itemId: item.id, quantity })} disabled={soldOut} />
      </div>
      <p className="col-start-2 text-[15px] font-bold text-highlight tabular md:col-start-auto" title={formatEthFull(lineTotal)}>
        <span className="sr-only">Total do item: </span>
        {formatEth(lineTotal, { maxDecimals: 6 })}
      </p>
      <Button variant="ghost" size="icon" className="col-start-3 row-start-1 size-10 text-caption hover:text-highlight md:col-start-auto md:row-start-auto" aria-label={`Remover ${label}`} onClick={() => remove.mutate({ itemId: item.id, label })} disabled={remove.isPending}>
        <Trash2 className="size-5" aria-hidden="true" />
      </Button>
    </li>
  )
}

function AlsoViewed({ exclude }: { exclude: string[] }) {
  const q = useQuery(nftListQuery({ sort: 'popular', pageSize: 18, page: 1 }))
  const items = (q.data?.items ?? []).filter((n) => !exclude.includes(n.id)).slice(0, 15)
  return <NftCarousel id="tambem-viram" title="Colecionadores também viram" items={items} loading={q.isPending} />
}

export function CouponForm({ couponCode }: { couponCode: string | null }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const id = useId()
  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-success/50 bg-success/10 px-4 py-3">
        <p className="flex items-center gap-2 font-semibold">
          <Tag className="size-4 text-success" aria-hidden="true" /> Cupom <span className="font-mono" data-testid="applied-coupon">{couponCode}</span> aplicado
        </p>
        <Button variant="ghost" size="xs" onClick={() => remove.mutate()} disabled={remove.isPending} aria-label={`Remover cupom ${couponCode}`}>
          <X aria-hidden="true" /> Remover
        </Button>
      </div>
    )
  }
  const error = apply.error?.fields?.code ?? apply.error?.message
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!code.trim()) return
        apply.mutate(code.trim(), { onSuccess: () => setCode('') })
      }}
    >
      <label htmlFor={id} className="text-[13px] font-bold max-md:sr-only">
        Código promocional<span className="sr-only"> (cupom de desconto)</span>
      </label>
      <div className="flex max-md:relative">
        <Input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional…"
          className="h-10 rounded-r-none border-primary text-[13px] uppercase placeholder:normal-case max-md:h-[50px] max-md:rounded-full max-md:border-line-soft max-md:bg-card max-md:pr-28 max-md:pl-6 max-md:text-[14px] max-md:tracking-[0.04em]"
          aria-invalid={apply.isError}
          aria-describedby={apply.isError ? `${id}-error` : undefined}
          autoComplete="off"
        />
        <Button type="submit" size="xs" className="h-10 rounded-l-none rounded-r-sm px-5 text-[15px] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:h-[50px] max-md:w-[97px] max-md:rounded-full max-md:bg-pill-gradient-soft max-md:font-bold max-md:text-foreground max-md:disabled:opacity-100" disabled={apply.isPending || !code.trim()}>
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {apply.isError && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive" data-testid="coupon-error">{error}</p>
      )}
    </form>
  )
}
