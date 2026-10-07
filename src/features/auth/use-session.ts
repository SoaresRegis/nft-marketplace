import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'
import type { User } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { qk, type Viewer } from '@/api/query-keys'
import { sessionStore } from '@/api/session-store'
import { useCredentials } from '@/api/viewer'

export const sessionQuery = (token: string | null) =>
  queryOptions({
    queryKey: qk.session(token),
    queryFn: ({ signal }) => api.getSession({ signal }),
    enabled: !!token,
    staleTime: 60_000,
    retry: (count, error) => !(error as { isAuthError?: boolean }).isAuthError && count < 2,
  })

export type SessionState =
  | { status: 'anonymous'; user: null }
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: User }

export function useSession(): SessionState {
  const { token } = useCredentials()
  const q = useQuery(sessionQuery(token))
  if (!token) return { status: 'anonymous', user: null }
  if (q.data) return { status: 'authenticated', user: q.data.user }
  if (q.isError) return { status: 'anonymous', user: null }
  return { status: 'loading', user: null }
}

/** Identidade usada para escopo do cache (usuário ou visitante). */
export function useViewer(): Viewer | null {
  const { token, guestCartId } = useCredentials()
  const session = useSession()
  if (token) return session.status === 'authenticated' ? { kind: 'user', userId: session.user.id } : null
  return { kind: 'guest', cartId: guestCartId }
}

/** Usado nos guards de rota: garante sessão válida ou retorna null. */
export async function ensureSession(queryClient: QueryClient) {
  const token = sessionStore.getToken()
  if (!token) return null
  try {
    return await queryClient.ensureQueryData(sessionQuery(token))
  } catch {
    return null
  }
}
