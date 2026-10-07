import { Link } from '@tanstack/react-router'
import { Receipt } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/use-session'
import { formatEth } from '@/lib/money'
import { formatDateTime } from '@/lib/utils'
import { useOrders } from './queries'

const STATUS = {
  pending: { label: 'Pendente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  rejected: { label: 'Recusado', variant: 'destructive' },
} as const

export function OrdersPage() {
  const session = useSession()
  return (
    <div className="container-page py-10 md:py-16">
      <h1 className="mb-8 text-[28px] font-semibold md:text-[38px]">Meus pedidos</h1>
      {session.status === 'authenticated' ? <OrdersList userId={session.user.id} /> : <Skeleton className="h-40 rounded-lg" />}
    </div>
  )
}

export function OrdersList({ userId }: { userId: string }) {
  const orders = useOrders(userId)
  if (orders.isPending) return <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
  if (orders.isError) return <ErrorState message={orders.error.message} onRetry={() => void orders.refetch()} retrying={orders.isFetching} />
  if (!orders.data.items.length) {
    return <EmptyState icon={<Receipt className="size-10 text-muted-foreground" aria-hidden="true" />} title="Nenhum pedido ainda" action={<Button asChild><Link to="/">Explorar NFTs</Link></Button>} />
  }
  return (
    <ul className="flex flex-col gap-3">
      {orders.data.items.map((o) => (
        <li key={o.id}>
          <Link to="/orders/$orderId" params={{ orderId: o.id }} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-5 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring">
            <span className="flex flex-col">
              <span className="font-mono text-sm">{o.id}</span>
              <span className="text-sm text-caption">{formatDateTime(o.createdAt)} · {o.lines.reduce((a, l) => a + l.quantity, 0)} itens</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono">{formatEth(o.totalEth)}</span>
              <Badge variant={STATUS[o.status].variant}>{STATUS[o.status].label}</Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
