import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Quote } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth, formatEthFull, isPositive } from '@/lib/money'
import { cn } from '@/lib/utils'

const NETWORK_LABELS = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

export function SummaryRows({
  quote,
  updating,
  feeNote = 'Taxa estimada',
}: {
  quote: Pick<Quote, 'subtotalEth' | 'discountEth' | 'networkFeeEth' | 'totalEth' | 'coupon' | 'network'>
  updating?: boolean
  feeNote?: string
}) {
  const discount = isPositive(quote.discountEth)
  return (
    <dl className="flex flex-col gap-3 text-[15px]" data-testid="summary">
      <div className="flex items-baseline justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="text-[17px] tabular whitespace-nowrap" data-testid="summary-subtotal" title={formatEthFull(quote.subtotalEth)}>
          {formatEth(quote.subtotalEth, { maxDecimals: 6 })}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt>Desconto {quote.coupon ? `(${quote.coupon.code})` : 'do lançamento'}</dt>
        <dd className={cn('tabular whitespace-nowrap', discount && 'text-success')} data-testid="summary-discount" title={formatEthFull(quote.discountEth)}>
          (-) {formatEth(quote.discountEth, { maxDecimals: 6 })}
        </dd>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <dt>
            Taxa de rede<span className="sr-only"> ({NETWORK_LABELS[quote.network]})</span>
          </dt>
          <dd className="text-[17px] tabular whitespace-nowrap" data-testid="summary-fee" title={formatEthFull(quote.networkFeeEth)}>
            {formatEth(quote.networkFeeEth, { maxDecimals: 6 })}
          </dd>
        </div>
        <p className="text-right text-xs text-highlight">
          {feeNote} na {NETWORK_LABELS[quote.network]}
        </p>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
        <dt className="font-bold">Total</dt>
        <dd className="flex items-center gap-2 text-[17px] font-bold whitespace-nowrap text-highlight tabular" data-testid="summary-total" title={formatEthFull(quote.totalEth)}>
          {updating && <Loader2 className="size-4 animate-spin text-caption" aria-label="Atualizando total" />}
          {formatEth(quote.totalEth, { maxDecimals: 6 })}
        </dd>
      </div>
    </dl>
  )
}

export function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Calculando resumo" data-testid="summary-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
      <Skeleton className="my-1 h-px w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}

export function SummaryCard({ title = 'Resumo do pedido', children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby="summary-title" className={cn('flex h-fit flex-col gap-5 lg:sticky lg:top-28', className)}>
      <h2 id="summary-title" className="border-b border-border pb-2 text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  )
}
