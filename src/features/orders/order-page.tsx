import { Link, getRouteApi } from '@tanstack/react-router'
import { Copy, Loader2, X, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { Order } from '@/api/contracts'
import { ApiError } from '@/api/errors'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/use-session'
import { loadDraft, saveDraft } from '@/features/checkout/draft'
import { formatEth, formatEthFull } from '@/lib/money'
import { shortAddress } from '@/lib/utils'
import { useOrder } from './queries'

const route = getRouteApi('/orders/$orderId')

export function OrderPage() {
  const session = useSession()
  if (session.status !== 'authenticated') return <OrderSkeleton />
  return <OrderView userId={session.user.id} />
}

function OrderView({ userId }: { userId: string }) {
  const { orderId } = route.useParams()
  const order = useOrder(userId, orderId)
  const status = order.data?.status

  useEffect(() => {
    if (!status || status === 'pending') return
    const draft = loadDraft(userId)
    if (draft.pendingOrderId === orderId || draft.attempt) {
      saveDraft(userId, { ...draft, pendingOrderId: null, attempt: null, connectedWalletId: status === 'confirmed' ? null : draft.connectedWalletId })
    }
  }, [status, userId, orderId])

  useEffect(() => {
    document.title = `${status === 'confirmed' ? 'Pedido confirmado' : 'Pedido'} | Kurio`
  }, [status])

  if (order.isPending) return <OrderSkeleton />
  if (order.isError) {
    const err = order.error
    if (err instanceof ApiError && (err.code === 'NOT_FOUND' || err.code === 'FORBIDDEN')) {
      return (
        <div className="container-page py-16">
          <EmptyState title="Pedido não encontrado" message="Este pedido não existe ou pertence a outra conta." action={<Button asChild><Link to="/account/activity">Meus pedidos</Link></Button>} />
        </div>
      )
    }
    return <div className="container-page py-16"><ErrorState message={err.message} onRetry={() => void order.refetch()} retrying={order.isFetching} /></div>
  }
  const o = order.data
  return (
    <div className="container-page py-10 md:py-[100px]">
      {o.status === 'pending' && <PendingState order={o} />}
      {o.status === 'rejected' && <RejectedState order={o} />}
      {o.status === 'confirmed' && <Receipt order={o} />}
    </div>
  )
}

const NETWORK_LABELS = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const
const EXPLORER = { ethereum: 'Etherscan', polygon: 'Polygonscan', solana: 'Solscan' } as const
const PROVIDERS = { metamask: 'MetaMask', coinbase: 'Coinbase Wallet', walletconnect: 'WalletConnect', rainbow: 'Rainbow' } as const

function OrderCard({ labelledBy, testId, children }: { labelledBy: string; testId: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={labelledBy} className="relative mx-auto flex max-w-[578px] flex-col border-b-[10px] border-primary bg-card pt-6 pb-12 shadow-2xl" data-testid={testId}>
      <Link
        to="/"
        className="absolute top-3 right-4 grid size-8 place-items-center rounded-sm text-highlight outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <X className="size-5" aria-hidden="true" />
        <span className="sr-only">Fechar e voltar à Início</span>
      </Link>
      {children}
    </section>
  )
}

function ThankYouIcon() {
  return (
    <svg viewBox="0 0 68 82" className="h-[82px] w-[68px] text-highlight" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 38v40h62V38" />
      <path d="M3 38l31 24 31-24" />
      <path d="M3 78l24-20M65 78L41 58" />
      <path d="M10 43V8h48v35" />
      <path d="M28 8c0-3 3-5 6-5s6 2 6 5" />
      <text x="34" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" stroke="none" fontFamily="inherit">
        THANK
      </text>
      <text x="34" y="36" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor" stroke="none" fontFamily="inherit">
        YOU
      </text>
    </svg>
  )
}

function PendingState({ order }: { order: Order }) {
  return (
    <OrderCard labelledBy="pending-title" testId="order-pending">
      <div className="flex flex-col items-center gap-5 px-8 pt-6 text-center">
        <Loader2 className="size-14 animate-spin text-highlight" aria-hidden="true" />
        <h1 id="pending-title" className="text-lg font-bold text-caption">
          Aguardando confirmação na {NETWORK_LABELS[order.network]}
        </h1>
        <p role="status" className="text-sm leading-6 text-caption">
          Seu pagamento de <strong className="text-foreground">{formatEth(order.totalEth)}</strong> foi enviado à rede. Você pode recarregar ou fechar esta página: o pedido
          continua sendo processado e não será cobrado duas vezes.
        </p>
        <p className="text-xs text-caption">Pedido {order.id}</p>
      </div>
    </OrderCard>
  )
}

function RejectedState({ order }: { order: Order }) {
  return (
    <OrderCard labelledBy="rejected-title" testId="order-rejected">
      <div className="flex flex-col items-center gap-5 px-8 pt-6 text-center">
        <XCircle className="size-14 text-destructive" aria-hidden="true" />
        <h1 id="rejected-title" className="text-lg font-bold">
          Pagamento recusado
        </h1>
        <p className="text-sm text-caption">{order.failureReason ?? 'O pagamento não foi concluído.'} Seus itens continuam no carrinho.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="h-11 rounded-md px-5 text-[15px]">
            <Link to="/checkout">Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-md px-5 text-[15px]">
            <Link to="/cart">Ver carrinho</Link>
          </Button>
        </div>
        <p className="text-xs text-caption">Pedido {order.id}</p>
      </div>
    </OrderCard>
  )
}

function Receipt({ order }: { order: Order }) {
  const tx = order.transaction!
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.updatedAt))
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tx.hash)
      toast.success('Hash copiado')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }
  const discount = Number(order.discountEth) > 0
  return (
    <OrderCard labelledBy="receipt-title" testId="order-confirmed">
      <div className="flex flex-col items-center gap-4 px-8">
        <ThankYouIcon />
        <h1 id="receipt-title" className="text-center text-[15px] font-bold text-caption">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-3 text-[13px] sm:grid-cols-4 sm:divide-x sm:divide-primary">
        <div className="sm:pr-3">
          <dt className="font-bold text-caption">ID da transação</dt>
          <dd className="flex items-center gap-1 text-caption" data-testid="receipt-tx" data-hash={tx.hash}>
            <span title={tx.hash}>{shortAddress(tx.hash)}</span>
            <button type="button" onClick={() => void copy()} className="rounded-sm p-0.5 outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring" aria-label="Copiar hash da transação">
              <Copy className="size-3.5" aria-hidden="true" />
            </button>
          </dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-caption">Data</dt>
          <dd className="text-caption">{date}</dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-caption">Total</dt>
          <dd className="text-caption tabular">{formatEth(order.totalEth, { maxDecimals: 6 })}</dd>
        </div>
        <div className="sm:pl-3">
          <dt className="font-bold text-caption">Carteira</dt>
          <dd className="text-caption">{PROVIDERS[order.wallet.provider]}</dd>
        </div>
      </dl>

      <div className="mt-7 flex flex-col gap-3 px-6 sm:px-11">
        <h2 className="text-[15px] font-bold">Detalhes da transação</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_70px_100px] border-b border-border pb-2 text-[15px] font-bold" aria-hidden="true">
          <span>NFTs</span>
          <span className="text-center">Edições</span>
          <span className="text-right">Subtotal</span>
        </div>
        <ul className="flex flex-col gap-3" data-testid="receipt-items">
          {order.lines.map((l) => (
            <li key={l.itemId} className="grid grid-cols-[minmax(0,1fr)_70px_100px] items-center">
              <span className="flex min-w-0 items-center gap-3">
                <img src={l.image} alt="" width={66} height={66} className="size-[66px] shrink-0 rounded-sm object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">{l.name}</span>
                  <span className="block text-[13px] text-caption">ID do token: #{l.tokenId}</span>
                </span>
              </span>
              <span className="text-center text-[13px] text-caption">
                <span aria-hidden="true">(x {l.quantity})</span>
                <span className="sr-only">
                  {l.quantity} unidades, edição {l.editionName}
                </span>
              </span>
              <span className="text-right text-[17px] font-bold text-highlight tabular" title={formatEthFull(l.lineTotalEth)}>
                {formatEth(l.lineTotalEth, { maxDecimals: 6 })}
              </span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto flex w-full max-w-[320px] flex-col gap-1.5 pt-2 text-[15px]">
          {discount && (
            <div className="flex justify-between gap-4">
              <dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
              <dd className="text-success tabular">(-) {formatEth(order.discountEth, { maxDecimals: 6 })}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt>Taxa de rede</dt>
            <dd className="text-[17px] tabular">{formatEth(order.networkFeeEth, { maxDecimals: 6 })}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold">Total</dt>
            <dd className="text-[17px] font-bold text-highlight tabular" data-testid="summary-total">
              {formatEth(order.totalEth, { maxDecimals: 6 })}
            </dd>
          </div>
        </dl>
        <p className="border-t border-border pt-3 text-center text-[13px] leading-6 text-caption">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para {order.wallet.label} e registrada na rede. Recibo enviado para{' '}
          {order.collector.email}.
        </p>
        <div className="flex justify-center pt-2">
          <ExplorerDialog order={order} />
        </div>
        <p className="text-center text-xs text-caption">
          Pedido <span data-testid="receipt-order-id">{order.id}</span> ·{' '}
          <Link to="/account/activity" className="rounded-sm text-highlight outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring">
            Ver meus pedidos
          </Link>
        </p>
      </div>
    </OrderCard>
  )
}

function ExplorerDialog({ order }: { order: Order }) {
  const tx = order.transaction!
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-12 rounded-sm px-4 text-[15px]">Ver no {EXPLORER[order.network]}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{EXPLORER[order.network]} (simulado)</DialogTitle>
          <DialogDescription>Esta transação existe apenas na simulação. Nenhum explorador real é aberto.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-caption">Hash</dt>
            <dd className="break-all">{tx.hash}</dd>
          </div>
          <div>
            <dt className="text-caption">Bloco</dt>
            <dd>{tx.blockNumber}</dd>
          </div>
          <div>
            <dt className="text-caption">Rede</dt>
            <dd>{NETWORK_LABELS[order.network]}</dd>
          </div>
          <div>
            <dt className="text-caption">URL simulada</dt>
            <dd className="break-all text-caption">{tx.explorerUrl}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  )
}

function OrderSkeleton() {
  return (
    <div className="container-page py-16" aria-busy="true" aria-label="Carregando pedido">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="mx-auto size-14 rounded-full" />
        <Skeleton className="mx-auto h-10 w-2/3" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  )
}
