import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Network } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { qk } from '@/api/query-keys'
import { useViewer } from '@/features/auth/use-session'
import { useCart } from './use-cart'

export function useQuote(network: Network, { enabled = true } = {}) {
  const viewer = useViewer()
  const cart = useCart()
  const hasItems = (cart.data?.items.length ?? 0) > 0
  return useQuery({
    queryKey: viewer ? [...qk.quote(viewer, network), cart.data?.version ?? 0] : ['quote', 'pending'],
    queryFn: ({ signal }) => api.getQuote({ network }, { signal }),
    enabled: enabled && !!viewer && hasItems,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: 60_000,
  })
}
