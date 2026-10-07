import { useSyncExternalStore } from 'react'
import { sessionStore } from './session-store'

let snapshot = { token: sessionStore.getToken(), guestCartId: sessionStore.getGuestCartId() }
const listeners = new Set<() => void>()

function refresh() {
  const next = { token: sessionStore.getToken(), guestCartId: sessionStore.getGuestCartId() }
  if (next.token !== snapshot.token || next.guestCartId !== snapshot.guestCartId) {
    snapshot = next
    listeners.forEach((l) => l())
  }
}

sessionStore.subscribe(refresh)

export function setGuestCartId(id: string | null) {
  sessionStore.setGuestCartId(id)
  refresh()
}

export function useCredentials() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
}
