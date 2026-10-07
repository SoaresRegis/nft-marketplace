import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { qk } from '@/api/query-keys'

/**
 * Pedido: o estado chega por Socket.IO (order.updated). Enquanto pendente,
 * há também um polling de segurança, e ao reconectar o cliente reconcilia via
 * REST. Estados confirmados/recusados são terminais: sem polling.
 */
export function useOrder(userId: string, orderId: string) {
  return useQuery({
    queryKey: qk.order(userId, orderId),
    queryFn: ({ signal }) => api.getOrder(orderId, { signal }),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 5000 : false),
    staleTime: (q) => (q.state.data && q.state.data.status !== 'pending' ? Infinity : 0),
    retry: (count, error) => (error as { status?: number }).status !== 404 && (error as { status?: number }).status !== 403 && count < 2,
  })
}

export function useOrders(userId: string) {
  return useQuery({ queryKey: qk.orders(userId), queryFn: ({ signal }) => api.listOrders({ signal }) })
}
