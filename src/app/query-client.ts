import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'

/**
 * Política de cache/retry (documentada em docs/STATE.md):
 *  - staleTime 30s para catálogo; dados privados usam o default e são
 *    invalidados por mutations/eventos.
 *  - retry só para falhas transitórias (rede, timeout, 5xx), até 2 vezes com
 *    backoff exponencial. Erros 4xx não são repetidos.
 *  - mutations nunca são repetidas automaticamente, exceto criação de pedido,
 *    que é idempotente (mesma Idempotency-Key).
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => error instanceof ApiError && error.retryable && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      },
      mutations: { retry: false },
    },
  })
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}
