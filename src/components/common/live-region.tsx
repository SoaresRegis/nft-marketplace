import { useSyncExternalStore } from 'react'

/**
 * Região aria-live global para anunciar mutations e eventos em tempo real a
 * leitores de tela, independente de toasts visuais.
 */
type Msg = { id: number; text: string; politeness: 'polite' | 'assertive' }
let current: Msg = { id: 0, text: '', politeness: 'polite' }
const listeners = new Set<() => void>()

export function announce(text: string, politeness: 'polite' | 'assertive' = 'polite') {
  current = { id: current.id + 1, text, politeness }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function LiveRegion() {
  const msg = useSyncExternalStore(subscribe, () => current)
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {msg.politeness === 'polite' ? msg.text : ''}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {msg.politeness === 'assertive' ? msg.text : ''}
      </div>
    </>
  )
}
