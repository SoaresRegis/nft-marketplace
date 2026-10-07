/**
 * Fonte única do token de sessão e do identificador do carrinho do visitante.
 * Não guarda dados do usuário (esses ficam no cache do Query) nem senhas.
 */
import { readStorage, writeStorage } from '@/lib/storage'

const TOKEN_KEY = 'nft:session-token'
const GUEST_CART_KEY = 'nft:guest-cart-id'

type Listener = (reason: SessionChangeReason) => void
export type SessionChangeReason = 'login' | 'logout' | 'expired'

let token: string | null = readStorage(TOKEN_KEY)
let lastReason: SessionChangeReason | null = null
const listeners = new Set<Listener>()

export const sessionStore = {
  getToken: () => token,
  getLastReason: () => lastReason,
  setToken(next: string | null, reason: SessionChangeReason) {
    if (next === token) return
    token = next
    lastReason = reason
    writeStorage(TOKEN_KEY, next)
    listeners.forEach((l) => l(reason))
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getGuestCartId: () => readStorage(GUEST_CART_KEY),
  setGuestCartId: (id: string | null) => writeStorage(GUEST_CART_KEY, id),
}

// Sincroniza logout/login entre abas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY && e.newValue !== token) {
      token = e.newValue
      listeners.forEach((l) => l(e.newValue ? 'login' : 'logout'))
    }
  })
}
