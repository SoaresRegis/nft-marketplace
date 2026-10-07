/**
 * Aplica eventos de tempo real ao cache do TanStack Query. Eventos nunca
 * mexem na UI diretamente: atualizam o cache (ou o invalidam) e a interface
 * reage. Ver docs/REALTIME.md.
 */
import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart, NftDetail, NftList, NftUpdatedEvent, Order } from '@/api/contracts'
import { qk } from '@/api/query-keys'
import { announce } from '@/components/common/live-region'
import { formatEth } from '@/lib/money'
import { EventGate } from './event-gate'
import type { RealtimeHandlers } from './client'

export const eventGate = new EventGate()

function patchSummary<T extends { id: string; version: number; priceEth: string; available: number }>(item: T, e: NftUpdatedEvent): T {
  if (item.id !== e.data.nftId || item.version >= e.version) return item
  return { ...item, priceEth: e.data.priceEth, available: e.data.available, version: e.version }
}

function isCartKey(key: readonly unknown[]) {
  return key.length === 3 && (key[0] === 'private' || key[0] === 'guest') && key[2] === 'cart'
}

export function createRealtimeSync(queryClient: QueryClient, getUserId: () => string | null): RealtimeHandlers {
  return {
    onNftUpdated(e) {
      const detailKey = qk.nfts.detail(e.data.nftId)
      const cached = queryClient.getQueryData<NftDetail>(detailKey)
      if (!eventGate.accept(e, cached?.version)) return

      if (cached) {
        queryClient.setQueryData<NftDetail>(detailKey, {
          ...cached,
          priceEth: e.data.priceEth,
          available: e.data.available,
          editions: e.data.editions,
          version: e.version,
        })
      }
      queryClient.setQueriesData<NftList>({ queryKey: qk.nfts.lists }, (old) =>
        old ? { ...old, items: old.items.map((i) => patchSummary(i, e)) } : old,
      )
      queryClient.setQueryData<{ items: NftDetail[] }>(qk.nfts.featured, (old) =>
        old
          ? { items: old.items.map((i) => (i.id === e.data.nftId && i.version < e.version ? { ...patchSummary(i, e), editions: e.data.editions } : i)) }
          : old,
      )

      const carts = queryClient.getQueryCache().findAll({ predicate: (q) => isCartKey(q.queryKey) })
      const affected = carts.some((q) => (q.state.data as Cart | undefined)?.items.some((i) => i.nftId === e.data.nftId))
      if (affected) {
        carts.forEach((q) => void queryClient.invalidateQueries({ queryKey: q.queryKey }))
        void queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] === 'private' || q.queryKey[0] === 'guest') && q.queryKey[2] === 'quote' })
        const msg = e.data.changes.includes('price')
          ? `O preço de ${e.data.name} no seu carrinho mudou. Agora a partir de ${formatEth(e.data.priceEth)}.`
          : e.data.available === 0
            ? `${e.data.name}, que está no seu carrinho, esgotou.`
            : `A disponibilidade de ${e.data.name} no seu carrinho mudou.`
        toast.warning('Carrinho atualizado', { description: msg, id: `cart-change-${e.data.nftId}` })
        announce(msg, 'assertive')
      } else if (cached) {
        announce(`${e.data.name} foi atualizado: ${formatEth(e.data.priceEth)}, ${e.data.available} disponíveis.`)
      }
    },

    onOrderUpdated(e) {
      const userId = getUserId()      

      if (!userId || e.data.userId !== userId) return
      const key = qk.order(userId, e.data.orderId)
      const cached = queryClient.getQueryData<Order>(key)
      if (!eventGate.accept(e, cached?.version)) return
      if (cached) {
        queryClient.setQueryData<Order>(key, {
          ...cached,
          status: e.data.status,
          transaction: e.data.transaction,
          failureReason: e.data.failureReason,
          version: e.version,
        })
      }
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: qk.orders(userId), exact: true })
      if (e.data.status === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: qk.cart({ kind: 'user', userId }) })
        toast.success('Pedido confirmado', { id: `order-${e.data.orderId}`, description: 'Seu pagamento foi confirmado na rede.' })
        announce('Pedido confirmado. Seu pagamento foi confirmado.', 'assertive')
      } else if (e.data.status === 'rejected') {
        toast.error('Pagamento recusado', { id: `order-${e.data.orderId}`, description: e.data.failureReason ?? undefined })
        announce(`Pagamento recusado. ${e.data.failureReason ?? ''}`, 'assertive')
      }
    },

    onReconnect() {      
      void queryClient.invalidateQueries({ queryKey: qk.nfts.all, refetchType: 'active' })
      void queryClient.invalidateQueries({ predicate: (q) => isCartKey(q.queryKey) })
      const userId = getUserId()
      if (userId) void queryClient.invalidateQueries({ queryKey: [...qk.orders(userId)] })
      announce('Conexão em tempo real restabelecida.')
    },
  }
}
