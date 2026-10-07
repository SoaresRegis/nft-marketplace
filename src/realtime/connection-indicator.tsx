import { useConnectionState } from './client'

const LABELS = {
  idle: null,
  connecting: 'Conectando ao tempo real…',
  connected: null,
  reconnecting: 'Reconectando ao tempo real… Os dados serão sincronizados ao voltar.',
  disconnected: null,
} as const

/** Aviso discreto quando a conexão em tempo real cai */
export function ConnectionIndicator() {
  const state = useConnectionState()
  const label = LABELS[state]
  return (
    <div data-testid="realtime-status" data-state={state} className="pointer-events-none fixed bottom-above-bar left-1/2 z-40 -translate-x-1/2">
      {label && state === 'reconnecting' && (
        <p role="status" className="flex items-center gap-2 rounded-full border border-warning/50 bg-card px-4 py-2 text-sm shadow-lg">
          <span className="size-2 animate-pulse rounded-full bg-warning" aria-hidden="true" />
          {label}
        </p>
      )}
    </div>
  )
}
