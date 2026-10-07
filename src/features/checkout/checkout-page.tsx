import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useIsMutating } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronDown, EllipsisVertical, Loader2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { collectorInput, networks, type CollectorInput, type Network, type Quote, type User, type Wallet } from '@/api/contracts'
import { ApiError } from '@/api/errors'
import { Breadcrumbs, MARKET_CRUMBS } from '@/components/common/breadcrumbs'
import { EnsInput, Req, fieldLabelClass } from '@/components/common/form-bits'
import { announce } from '@/components/common/live-region'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/features/account/wallets-page'
import { useSession } from '@/features/auth/use-session'
import { CouponForm } from '@/features/cart/cart-page'
import { SummaryCard, SummaryRows, SummarySkeleton } from '@/features/cart/order-summary'
import { useAcknowledgeCart, useCart } from '@/features/cart/use-cart'
import { useQuote } from '@/features/cart/use-quote'
import { formatEth } from '@/lib/money'
import { MobileTopBar, useMobileSubmitBar } from '@/components/layout/mobile-bars'
import { useIsMobile } from '@/lib/use-media-query'
import { cn, shortAddress } from '@/lib/utils'
import type { CheckoutDraft } from './draft'
import { nextAttempt, quoteSignature, useCheckoutDraft, useCreateOrder, useWalletConnection, useWallets } from './use-checkout'

export function CheckoutPage() {
  const session = useSession()
  if (session.status !== 'authenticated') {
    return (
      <div className="container-page flex justify-center py-24">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando sessão" />
      </div>
    )
  }
  return <Checkout user={session.user} />
}

function Checkout({ user }: { user: User }) {
  const userId = user.id
  const [draft, update] = useCheckoutDraft(userId)
  const cart = useCart()
  const quote = useQuote(draft.network)
  const wallets = useWallets(userId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const submitting = useIsMutating({ mutationKey: ['create-order', userId] }) > 0
  const list = useMemo(() => wallets.data?.items ?? [], [wallets.data])
  const wallet = list.find((w) => w.id === draft.walletId) ?? null

  useEffect(() => {
    document.title = 'Pagamento | Kurio'
  }, [])

  useEffect(() => {
    if (!draft.walletId && list.length) update({ walletId: (list.find((w) => w.role === 'primary') ?? list[0]).id })
  }, [list, draft.walletId, update])

  if (cart.data && cart.data.items.length === 0 && !draft.pendingOrderId && !submitting) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Seu carrinho está vazio"
          message="Adicione NFTs ao carrinho para finalizar uma compra."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page flex flex-col gap-3 pt-6 pb-16 max-md:pt-0 lg:pb-24">
      <MobileTopBar title="Pagamento com carteira" fallback="/cart" />
      <Breadcrumbs items={[...MARKET_CRUMBS, { label: 'Pagamento' }]} className="max-md:hidden" />
      <h1 ref={headingRef} tabIndex={-1} className="sr-only max-md:hidden">
        Pagamento
      </h1>
      {draft.pendingOrderId && <PendingOrderNotice orderId={draft.pendingOrderId} />}
      {wallets.isError ? (
        <ErrorState message={wallets.error.message} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} />
      ) : wallets.isPending ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin" aria-label="Carregando carteiras" />
        </div>
      ) : (
        <CheckoutForm key={wallet?.id ?? 'none'} user={user} draft={draft} update={update} wallets={list} wallet={wallet} quote={quote.data} quoteState={quote} />
      )}
    </div>
  )
}

function PendingOrderNotice({ orderId }: { orderId: string }) {
  return (
    <Alert variant="info" className="my-3" data-testid="pending-order-notice">
      <Loader2 className="animate-spin" aria-hidden="true" />
      <AlertTitle>Você tem um pedido em processamento</AlertTitle>
      <AlertDescription>
        Acompanhe o pedido antes de iniciar outra compra.{' '}
        <Link to="/orders/$orderId" params={{ orderId }} className="font-semibold text-highlight underline-offset-4 hover:underline">
          Ver pedido
        </Link>
      </AlertDescription>
    </Alert>
  )
}

function defaultsFor(user: User, draft: CheckoutDraft, wallet: Wallet | null): CollectorInput {
  if (draft.collector) return draft.collector
  return {
    fullName: wallet?.displayName || user.name,
    username: user.username,
    profileName: wallet?.profileName || user.name,
    email: wallet?.email || user.email,
    ensName: wallet?.ensName || user.ensName,
    referralCode: wallet?.referralCode ?? '',
    note: '',
  }
}

function CheckoutForm({
  user,
  draft,
  update,
  wallets,
  wallet,
  quote,
  quoteState,
}: {
  user: User
  draft: CheckoutDraft
  update: (p: Partial<CheckoutDraft>) => void
  wallets: Wallet[]
  wallet: Wallet | null
  quote: Quote | undefined
  quoteState: ReturnType<typeof useQuote>
}) {
  const navigate = useNavigate()
  const userId = user.id
  const form = useForm<CollectorInput>({ resolver: zodResolver(collectorInput), defaultValues: defaultsFor(user, draft, wallet), mode: 'onTouched' })
  const { connect, disconnect } = useWalletConnection()
  const createOrder = useCreateOrder(userId)
  const acknowledge = useAcknowledgeCart()
  const [confirmedSig, setConfirmedSig] = useState<string | null>(null)
  const [staleNotice, setStaleNotice] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [collectorOpen, setCollectorOpen] = useState(false)
  const isMobile = useIsMobile()
  const uid = useId()

  // Guarda o que foi digitado: sessão expirada ou refresh não perdem o formulário.
  useEffect(() => {
    const sub = form.watch((values) => update({ collector: { ...defaultsFor(user, draft, wallet), ...values } as CollectorInput }))
    return () => sub.unsubscribe()
  }, [form, update, user, draft, wallet])

  const connected = !!wallet && draft.connectedWalletId === wallet.id && draft.connectedNetwork === draft.network
  const unsupported = !!wallet && !wallet.networks.includes(draft.network)

  const signature = quote ? quoteSignature(quote) : null
  // A primeira cotação exibida é a que o usuário está revisando.
  useEffect(() => {
    if (signature && confirmedSig === null) setConfirmedSig(signature)
  }, [signature, confirmedSig])
  const changedSinceReview = !!signature && !!confirmedSig && signature !== confirmedSig
  useEffect(() => {
    if (changedSinceReview) announce('Os valores do pedido mudaram. Revise e confirme novamente.', 'assertive')
  }, [changedSinceReview])

  const issues = quote?.issues ?? []
  const needsAck = issues.some((i) => i.type === 'PRICE_CHANGED' || i.type === 'INSUFFICIENT_AVAILABILITY')
  const blockingSoldOut = issues.some((i) => i.type === 'SOLD_OUT')
  const couponIssue = issues.find((i) => i.type === 'COUPON_EXPIRED' || i.type === 'COUPON_INVALID')
  const quoteLoading = quoteState.isPending || quoteState.isFetching
  const busy = connect.isPending || createOrder.isPending
  const canConfirm = !!quote && quote.valid && !changedSinceReview && !quoteLoading && !busy && !!wallet && !unsupported && !draft.pendingOrderId

  const dropConnection = () => {
    if (draft.connectedWalletId) disconnect.mutate({ walletId: draft.connectedWalletId })
    update({ connectedWalletId: null, connectedNetwork: null })
  }
  const choose = (patch: Partial<CheckoutDraft>) => {
    if (draft.connectedWalletId) dropConnection()
    connect.reset()
    update(patch)
  }
  const otherWallet = wallets.find((w) => w.id !== wallet?.id)
  const primary = wallets.find((w) => w.role === 'primary')

  const submit = async () => {
    const valid = await form.trigger()
    if (!valid) {
      // No mobile o formulário fica recolhido: abre antes de levar o foco ao primeiro erro.
      setCollectorOpen(true)
      requestAnimationFrame(() => {
        const first = Object.keys(form.formState.errors)[0] as keyof CollectorInput | undefined
        if (first) form.setFocus(first)
      })
      announce('Revise os campos destacados no perfil do colecionador.', 'assertive')
      return
    }
    if (!quote || !wallet || !canConfirm) return
    const collector = form.getValues()
    update({ collector })
    if (!connected) {
      try {
        const c = await connect.mutateAsync({ walletId: wallet.id, network: draft.network })
        update({ connectedWalletId: c.walletId, connectedNetwork: c.network })
        announce(`Carteira ${wallet.label} conectada na rede ${NETWORK_LABELS[c.network]}.`)
      } catch (e) {
        announce(`Conexão recusada: ${(e as Error).message}`, 'assertive')
        return
      }
    }
    const input = { quoteId: quote.id, walletId: wallet.id, network: draft.network, collector }
    const attempt = nextAttempt(draft, input)
    update({ attempt })
    setStaleNotice(false)
    createOrder.mutate(
      { input, key: attempt.key },
      {
        onSuccess: (order) => {
          update({ pendingOrderId: order.id })
          announce('Pedido enviado. Aguardando confirmação do pagamento.')
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
        },
        onError: (error) => {
          if (error.code === 'QUOTE_STALE') {
            setStaleNotice(true)
            setConfirmedSig(null)
            update({ attempt: null })
          } else if (error.code === 'CONFLICT' && error.fields?.walletId) {
            update({ connectedWalletId: null, connectedNetwork: null })
          } else if (!(error instanceof ApiError) || !error.retryable) {
            update({ attempt: null })
          }
          announce(`Não foi possível confirmar: ${error.message}`, 'assertive')
          if (error.code !== 'QUOTE_STALE') toast.error('Pedido não enviado', { description: error.message })
        },
      },
    )
  }

  const text = (name: 'fullName' | 'username' | 'profileName' | 'email' | 'referralCode', label: string, required = true) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={fieldLabelClass}>
            {label}
            {required ? <Req /> : ' (opcional)'}
          </FormLabel>
          <FormControl>
            <Input
              type={name === 'email' ? 'email' : 'text'}
              autoComplete={name === 'email' ? 'email' : name === 'fullName' ? 'name' : name === 'username' ? 'username' : 'off'}
              aria-required={required || undefined}
              className={cn(name === 'referralCode' && 'uppercase')}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const formEl = (
        <Form {...form}>
          <form
            noValidate
            id="checkout-form"
            aria-label="Perfil do colecionador"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
            className="grid gap-x-6 gap-y-5 md:grid-cols-2"
          >
            {text('fullName', 'Nome de exibição')}
            {text('username', 'Nome de usuário')}
            <div className="flex flex-col gap-2">
              <label htmlFor={`${uid}-network`} className={fieldLabelClass}>
                Rede
                <Req />
              </label>
              <Select value={draft.network} onValueChange={(n: Network) => choose({ network: n })}>
                <SelectTrigger id={`${uid}-network`} aria-required>
                  <SelectValue placeholder="Selecione uma rede" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((n) => (
                    <SelectItem key={n} value={n}>
                      {NETWORK_LABELS[n]}
                      {wallet && !wallet.networks.includes(n) ? ' (não habilitada nesta carteira)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {text('profileName', 'Nome do perfil')}
            <div className="flex flex-col gap-2">
              <label htmlFor={`${uid}-address`} className={fieldLabelClass}>
                Endereço da carteira
                <Req />
              </label>
              <Input id={`${uid}-address`} readOnly value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" className="text-[13px]" aria-describedby={`${uid}-address-hint`} />
              <p id={`${uid}-address-hint`} className="text-xs text-caption">
                Vem da carteira escolhida em “Carteira e rede”.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:pt-[30px]">
              <label htmlFor={`${uid}-secondary`} className="sr-only">
                ENS ou carteira secundária (opcional)
              </label>
              <Input id={`${uid}-secondary`} readOnly value={wallet?.secondaryAddress || (wallet?.ensName ? `${wallet.ensName}.eth` : '')} placeholder="ENS ou carteira secundária (opcional)" className="text-[13px]" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${uid}-provider`} className={fieldLabelClass}>
                Tipo de carteira
                <Req />
              </label>
              <Select value={wallet?.id} onValueChange={(id) => choose({ walletId: id })} disabled={!wallets.length}>
                <SelectTrigger id={`${uid}-provider`} aria-required>
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {PROVIDER_LABELS[w.provider]} · {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {text('referralCode', 'Código de indicação', false)}
            {text('email', 'E-mail')}
            <FormField
              control={form.control}
              name="ensName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>Nome ENS (opcional)</FormLabel>
                  <FormControl>
                    <EnsInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {otherWallet && (
              <label className="flex cursor-pointer items-center gap-2 text-[15px] md:col-span-2">
                <input
                  type="checkbox"
                  checked={!!wallet && !!primary && wallet.id !== primary.id}
                  onChange={(e) => choose({ walletId: e.target.checked ? (wallets.find((w) => w.id !== primary?.id) ?? otherWallet).id : (primary ?? otherWallet).id })}
                  className="size-4 cursor-pointer appearance-none rounded-full border border-primary outline-none checked:border-[5px] focus-visible:ring-[3px] focus-visible:ring-ring"
                />
                Usar outra carteira?
              </label>
            )}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className={fieldLabelClass}>Observação do colecionador (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={6} className="md:max-w-[350px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
  )
  const summaryEl = (
        <SummaryCard title="Seus NFTs">
          {quote ? (
            <>
              <div>
                <div className="flex justify-between border-b border-border pb-2 text-[15px] font-bold" aria-hidden="true">
                  <span>NFTs</span>
                  <span>Subtotal</span>
                </div>
                <ul className="mt-3 flex flex-col gap-3" aria-label="Itens do pedido">
                  {quote.lines.map((l) => (
                    <li key={l.itemId} className="flex items-center gap-3 bg-card pr-4">
                      <img src={l.image} alt="" width={70} height={70} className="size-[70px] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">{l.name}</p>
                        <p className="text-[13px] text-caption">ID do token: #{l.tokenId}</p>
                      </div>
                      <span className="text-[13px] text-caption">
                        <span aria-hidden="true">(x {l.quantity})</span>
                        <span className="sr-only">{l.quantity} unidades</span>
                      </span>
                      <span className="text-[17px] font-bold text-highlight tabular">{formatEth(l.lineTotalEth)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCoupon((v) => !v)}
                  aria-expanded={showCoupon}
                  className="rounded-sm text-[13px] outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  Tem um código promocional? Aplique aqui
                </button>
                {showCoupon && (
                  <div className="w-full">
                    <CouponForm couponCode={null} />
                  </div>
                )}
              </div>
              <SummaryRows quote={quote} updating={quoteState.isFetching} />
            </>
          ) : quoteState.isError ? (
            <ErrorState className="py-6" title="Falha ao calcular" message={quoteState.error.message} onRetry={() => void quoteState.refetch()} retrying={quoteState.isFetching} />
          ) : (
            <SummarySkeleton />
          )}
        </SummaryCard>
  )
  const statusEl = (
          <p className="text-xs text-caption" aria-live="polite">
            {unsupported
              ? `Esta carteira não está habilitada na rede ${NETWORK_LABELS[draft.network]}. Escolha outra rede ou edite a carteira.`
              : connect.isPending
                ? 'Aguardando aprovação na carteira…'
                : connected
                  ? `Conectada na rede ${NETWORK_LABELS[draft.network]}.`
                  : wallet
                    ? `Ao confirmar, pediremos a conexão de ${wallet.label} na rede ${NETWORK_LABELS[draft.network]}.`
                    : ''}
          </p>
  )
  const alertsEl = (
    <>
        {connect.isError && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Conexão não concluída</AlertTitle>
            <AlertDescription>{connect.error.message} Tente novamente ou escolha outra carteira.</AlertDescription>
          </Alert>
        )}
        {staleNotice && (
          <Alert variant="warning" data-testid="quote-stale-alert">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Os valores mudaram antes da confirmação</AlertTitle>
            <AlertDescription>Preço, disponibilidade, cupom ou taxas foram atualizados. Revise o novo resumo e confirme novamente.</AlertDescription>
          </Alert>
        )}
        {changedSinceReview && !needsAck && (
          <Alert variant="warning" data-testid="quote-changed-alert">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>O resumo foi atualizado</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>O total agora é {quote && formatEth(quote.totalEth, { maxDecimals: 6 })}. Confirme que está de acordo antes de pagar.</span>
              <Button size="xs" variant="outline" className="self-start" onClick={() => setConfirmedSig(signature)}>
                Estou de acordo com os novos valores
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {needsAck && (
          <Alert variant="warning" data-testid="quote-issues-alert">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Itens do carrinho mudaram</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <ul className="list-disc pl-5">
                {issues.map((i, k) => (
                  <li key={k}>{i.message}</li>
                ))}
              </ul>
              <Button size="xs" variant="outline" className="self-start" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate(undefined, { onSuccess: () => setConfirmedSig(null) })}>
                {acknowledge.isPending ? 'Atualizando…' : 'Aceitar novos valores'}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {blockingSoldOut && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Há itens esgotados</AlertTitle>
            <AlertDescription>
              Remova os itens esgotados no{' '}
              <Link to="/cart" className="font-semibold underline">
                carrinho
              </Link>{' '}
              para continuar.
            </AlertDescription>
          </Alert>
        )}
        {couponIssue && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Cupom não aplicável</AlertTitle>
            <AlertDescription>
              {couponIssue.message} Remova o cupom no{' '}
              <Link to="/cart" className="font-semibold underline">
                carrinho
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}
        {createOrder.isPending && (
          <p role="status" className="flex items-center gap-2 text-sm text-caption" data-testid="order-submitting">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {createOrder.failureCount > 0 ? 'A conexão falhou. Verificando o mesmo pedido, sem cobrar duas vezes…' : 'Enviando pedido…'}
          </p>
        )}
        {createOrder.isError && createOrder.error.code !== 'QUOTE_STALE' && (
          <Alert variant="destructive" data-testid="order-error">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Pedido não enviado</AlertTitle>
            <AlertDescription>{createOrder.error.message} Seus itens continuam no carrinho.</AlertDescription>
          </Alert>
        )}
    </>
  )

  if (isMobile) {
    return (
      <MobileCheckout
        wallets={wallets}
        wallet={wallet}
        draft={draft}
        quote={quote}
        choose={choose}
        collectorOpen={collectorOpen}
        setCollectorOpen={setCollectorOpen}
        formEl={formEl}
        summaryEl={summaryEl}
        statusEl={statusEl}
        alertsEl={alertsEl}
        confirm={{ canConfirm, busy, connecting: connect.isPending, creating: createOrder.isPending }}
      />
    )
  }

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,763px)_minmax(0,405px)] lg:justify-between">
      {/* ------------------------------------------------ perfil do colecionador */}
      <section aria-labelledby="collector-title" className="flex min-w-0 flex-col gap-5">
        <h2 id="collector-title" className="text-[17px] font-bold">
          Perfil do colecionador
        </h2>
        {formEl}
      </section>

      {/* ------------------------------------------------------- resumo */}
      <div className="flex min-w-0 flex-col gap-5">
        {summaryEl}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 w-full text-center text-[17px] font-bold">Carteira e rede</legend>
          {wallets.length === 0 ? (
            <p className="text-sm text-caption">
              Você ainda não tem carteiras.{' '}
              <Link to="/account/wallets" className="font-semibold text-highlight underline-offset-4 hover:underline">
                Cadastre uma carteira
              </Link>{' '}
              para pagar. O que você preencheu aqui fica salvo.
            </p>
          ) : (
            <div role="radiogroup" aria-label="Carteira" className="flex flex-col gap-3">
              {wallets.map((w) => {
                const selected = w.id === wallet?.id
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose({ walletId: w.id })}
                    className={cn(
                      'flex min-h-11 items-center gap-3 border px-3 py-2 text-left text-[15px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                      selected ? 'border-foreground' : 'border-border hover:border-caption',
                    )}
                  >
                    <span className={cn('size-4 shrink-0 rounded-full border border-primary', selected && 'border-[5px]')} aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>
                        {PROVIDER_LABELS[w.provider]} <span className="text-caption">· {w.label}</span>
                      </span>
                      <span className="text-xs text-caption">{shortAddress(w.address)}</span>
                    </span>
                    {draft.connectedWalletId === w.id && draft.connectedNetwork === draft.network && (
                      <span className="flex items-center gap-1 text-xs text-success" data-testid="wallet-connected">
                        <CheckCircle2 className="size-4" aria-hidden="true" /> Conectada
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {statusEl}
        </fieldset>

        {alertsEl}

        <Button type="submit" form="checkout-form" className="h-11 w-full rounded-md text-[15px]" disabled={!canConfirm} aria-disabled={!canConfirm} data-testid="confirm-order">
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {connect.isPending ? 'Conectando carteira…' : createOrder.isPending ? 'Confirmando…' : 'Confirmar compra'}
          {quote && !busy && <span className="sr-only"> de {formatEth(quote.totalEth)}</span>}
        </Button>
      </div>
    </div>
  )
}

const NETWORK_LETTERS: Record<Network, string> = { ethereum: 'E', polygon: 'P', solana: 'S' }

function MobileCheckout({
  wallets,
  wallet,
  draft,
  quote,
  choose,
  collectorOpen,
  setCollectorOpen,
  formEl,
  summaryEl,
  statusEl,
  alertsEl,
  confirm,
}: {
  wallets: Wallet[]
  wallet: Wallet | null
  draft: CheckoutDraft
  quote: Quote | undefined
  choose: (patch: Partial<CheckoutDraft>) => void
  collectorOpen: boolean
  setCollectorOpen: (open: boolean) => void
  formEl: ReactNode
  summaryEl: ReactNode
  statusEl: ReactNode
  alertsEl: ReactNode
  confirm: { canConfirm: boolean; busy: boolean; connecting: boolean; creating: boolean }
}) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const barRef = useMobileSubmitBar()
  const card = 'rounded-[14px] bg-card'
  return (
    <div className="flex flex-col gap-5 pb-bottom-bar">
      <section aria-labelledby="m-wallets-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="m-wallets-title" className="text-[16px] font-bold tracking-[0.04em]">
            Carteira conectada
          </h2>
          <Link to="/account/wallets" className="rounded-sm text-[15px] font-bold tracking-[0.04em] text-highlight outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
            Trocar carteira
          </Link>
        </div>
        {wallets.length === 0 ? (
          <p className="text-sm text-caption">
            Você ainda não tem carteiras.{' '}
            <Link to="/account/wallets" className="font-semibold text-highlight underline-offset-4 hover:underline">
              Cadastre uma carteira
            </Link>{' '}
            para pagar.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Carteira" className="flex flex-col gap-5">
            {wallets.map((w) => {
              const selected = w.id === wallet?.id
              const isConnected = draft.connectedWalletId === w.id && draft.connectedNetwork === draft.network
              return (
                <div key={w.id} className={cn(card, 'relative flex items-center gap-4 py-4 pr-3 pl-5', selected && 'ring-1 ring-primary/60')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose({ walletId: w.id })}
                    className="flex min-w-0 flex-1 items-center gap-5 text-left outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:ring-[3px] focus-visible:after:ring-ring"
                  >
                    <span className={cn('size-[17px] shrink-0 rounded-full border border-line', selected && 'border-primary p-[3px]')} aria-hidden="true">
                      {selected && <span className="block size-full rounded-full bg-primary" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[16px] font-bold tracking-[0.04em]">{w.label}</span>
                      <span className="truncate text-[14px] tracking-[0.03em] text-caption">{w.ensName ? `${w.ensName}.eth` : shortAddress(w.address)}</span>
                      <span className="truncate text-[14px] tracking-[0.03em] text-caption">
                        Rede {NETWORK_LABELS[w.networks[0]]}
                        <span className="sr-only">, {PROVIDER_LABELS[w.provider]}</span>
                      </span>
                      {isConnected && (
                        <span className="flex items-center gap-1 text-xs text-success" data-testid="wallet-connected">
                          <CheckCircle2 className="size-4" aria-hidden="true" /> Conectada
                        </span>
                      )}
                    </span>
                  </button>
                  <Link
                    to="/account/wallets"
                    aria-label={`Gerenciar ${w.label}`}
                    className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <EllipsisVertical className="size-5" aria-hidden="true" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-[16px] font-bold tracking-[0.04em]">Carteira e rede</legend>
        <div role="radiogroup" aria-label="Rede" className="flex flex-col gap-4">
          {networks.map((n) => {
            const selected = draft.network === n
            const enabled = !wallet || wallet.networks.includes(n)
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose({ network: n })}
                className={cn(card, 'flex h-[65px] items-center gap-3 px-3.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring', !enabled && 'opacity-60')}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-soft bg-surface-2 text-[15px] font-bold text-highlight" aria-hidden="true">
                  {NETWORK_LETTERS[n]}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] tracking-[0.04em]">{NETWORK_LABELS[n]}</span>
                  {!enabled && <span className="text-xs text-caption">Não habilitada nesta carteira</span>}
                </span>
                <span className={cn('size-[17px] shrink-0 rounded-full border border-line', selected && 'border-primary p-[3px]')} aria-hidden="true">
                  {selected && <span className="block size-full rounded-full bg-primary" />}
                </span>
              </button>
            )
          })}
        </div>
        {statusEl}
      </fieldset>

      {alertsEl}

      <Disclosure title="Dados do colecionador" open={collectorOpen} onOpenChange={setCollectorOpen} hint="Preenchidos com o seu perfil">
        {formEl}
      </Disclosure>
      <Disclosure title="Resumo do pedido" open={summaryOpen} onOpenChange={setSummaryOpen} hint={quote ? `${quote.lines.length} ${quote.lines.length === 1 ? 'NFT' : 'NFTs'}` : undefined}>
        {summaryEl}
      </Disclosure>

      <p className="flex items-baseline justify-end gap-6 text-[16px] font-bold tracking-[0.04em]">
        Total:
        <span className="text-[19px] text-highlight tabular" data-testid="mobile-total">
          {quote ? formatEth(quote.totalEth, { maxDecimals: 6 }) : '…'}
        </span>
      </p>

      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-background/0 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          form="checkout-form"
          className="h-[60px] w-full rounded-full bg-pill-gradient text-[15px] font-bold tracking-[0.04em] text-primary-foreground hover:opacity-90"
          disabled={!confirm.canConfirm}
          aria-disabled={!confirm.canConfirm}
          data-testid="confirm-order"
        >
          {confirm.busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {confirm.connecting ? 'Conectando carteira…' : confirm.creating ? 'Confirmando…' : 'Confirmar compra'}
          {quote && !confirm.busy && <span className="sr-only"> de {formatEth(quote.totalEth)}</span>}
        </Button>
      </div>
    </div>
  )
}

function Disclosure({ title, hint, open, onOpenChange, children }: { title: string; hint?: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const id = useId()
  return (
    <section className="rounded-[14px] bg-card">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between gap-3 rounded-[14px] px-5 py-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <span className="flex flex-col">
            <span className="text-[15px] font-bold tracking-[0.04em]">{title}</span>
            {hint && <span className="text-xs text-caption">{hint}</span>}
          </span>
          <ChevronDown className={cn('size-5 text-highlight transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </h2>
      {/* Fica montado (oculto) para o formulário existir e validar mesmo recolhido. */}
      <div id={id} hidden={!open} className="px-5 pb-5">
        {children}
      </div>
    </section>
  )
}
