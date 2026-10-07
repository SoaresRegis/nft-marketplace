import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { toApiError } from './errors'
import { sessionStore } from './session-store'

import { transportReady } from './transport-ready'

export { transportReady }

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 8_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  // A camada de mocks (quando ligada) precisa estar ativa antes da primeira requisição.
  await transportReady()
  const token = sessionStore.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const guestCart = sessionStore.getGuestCartId()
  if (guestCart) config.headers.set('X-Guest-Cart', guestCart)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    // Sessão inválida/expirada numa requisição autenticada: encerra a sessão
    // local. O roteador observa a mudança e leva ao login preservando o
    // contexto (ver app/session.ts).
    const sentToken = (error?.config?.headers?.Authorization as string | undefined) ?? null
    if (apiError.isAuthError && sentToken && sentToken === `Bearer ${sessionStore.getToken()}`) {
      sessionStore.setToken(null, 'expired')
    }
    return Promise.reject(error?.code === 'ERR_CANCELED' ? error : apiError)
  },
)

/** Executa a requisição e valida a resposta contra o contrato. */
export async function request<S extends z.ZodTypeAny>(schema: S, config: AxiosRequestConfig): Promise<z.infer<S>> {
  const response = await http.request(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    if (import.meta.env.DEV) console.error('Contrato violado', config.url, parsed.error)
    throw toApiError(parsed.error)
  }
  return parsed.data
}
