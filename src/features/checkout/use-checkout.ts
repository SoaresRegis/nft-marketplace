import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import type { CreateOrderInput, Network, Order, Quote, WalletConnection } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import { qk } from '@/api/query-keys'
import { newId } from '@/lib/utils'
import { loadDraft, saveDraft, type CheckoutDraft } from './draft'

export function useCheckoutDraft(userId: string) {
  const [draft, setDraft] = useState<CheckoutDraft>(() => loadDraft(userId))
  useEffect(() => saveDraft(userId, draft), [userId, draft])
  const update = useCallback((patch: Partial<CheckoutDraft>) => setDraft((d) => ({ ...d, ...patch })), [])
  return [draft, update] as const
}

export function useWallets(userId: string) {
  return useQuery({
    queryKey: qk.wallets(userId),
    queryFn: ({ signal }) => api.listWallets({ signal }),
  })
}

export function useWalletConnection() {
  return {
    connect: useMutation<WalletConnection, ApiError, { walletId: string; network: Network }>({
      mutationFn: ({ walletId, network }) => api.connectWallet(walletId, network),
    }),
    disconnect: useMutation<WalletConnection, ApiError, { walletId: string }>({
      mutationFn: ({ walletId }) => api.disconnectWallet(walletId),
    }),
  }
}

function isRecoverable(error: unknown) {
  return error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR' || error.code === 'TRANSIENT_FAILURE')
}

/**
 * Criação de pedido idempotente. A mesma tentativa (mesmo conteúdo) usa
 * sempre a mesma Idempotency-Key; em timeout/queda de rede a requisição é
 * repetida com a mesma chave e o servidor devolve o mesmo pedido.
 */
export function useCreateOrder(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<Order, ApiError, { input: CreateOrderInput; key: string }>({
    mutationKey: ['create-order', userId],
    mutationFn: ({ input, key }) => api.createOrder(input, key),
    retry: (count, error) => isRecoverable(error) && count < 3,
    retryDelay: (attempt) => 800 * (attempt + 1),
    onSuccess: (order) => {
      queryClient.setQueryData(qk.order(userId, order.id), order)
      void queryClient.invalidateQueries({ queryKey: qk.orders(userId), exact: true })
    },
    onError: (error) => {
      if (error.code === 'QUOTE_STALE') {
        const fresh = (error.details as { quote?: Quote } | undefined)?.quote
        void queryClient.invalidateQueries({ queryKey: ['private', userId, 'cart'] })
        if (fresh) {
          queryClient.setQueriesData<Quote>({ queryKey: ['private', userId, 'quote', fresh.network] }, () => fresh)
        }
        void queryClient.invalidateQueries({ queryKey: ['private', userId, 'quote'] })
      }
    },
  })
}

export function attemptFingerprint(input: CreateOrderInput) {
  return JSON.stringify(input)
}

export function nextAttempt(draft: CheckoutDraft, input: CreateOrderInput) {
  const fingerprint = attemptFingerprint(input)
  if (draft.attempt && draft.attempt.fingerprint === fingerprint) return draft.attempt
  return { key: newId('ord-attempt'), fingerprint }
}

export function quoteSignature(q: Quote) {
  return JSON.stringify([q.lines.map((l) => [l.editionId, l.quantity, l.unitPriceEth]), q.discountEth, q.networkFeeEth, q.totalEth])
}
