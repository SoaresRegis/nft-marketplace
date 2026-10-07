import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { sessionStore } from '@/api/session-store'
import { qk } from '@/api/query-keys'
import { announce } from '@/components/common/live-region'
import { useSession } from '@/features/auth/use-session'
import { realtime } from '@/realtime/client'
import { createRealtimeSync, eventGate } from '@/realtime/sync'

/**
 * Efeitos de ciclo de vida da sessão:
 *  - um socket por sessão (reconecta com o novo token no login/logout);
 *  - logout/troca/expiração limpam dados privados do cache;
 *  - expiração reavalia os guards: telas privadas vão ao login com retorno.
 */
export function SessionEffects() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const session = useSession()
  const userIdRef = useRef<string | null>(null)
  userIdRef.current = session.status === 'authenticated' ? session.user.id : null

  useEffect(() => {
    const handlers = createRealtimeSync(queryClient, () => userIdRef.current)
    void realtime.connect(sessionStore.getToken(), handlers)

    const unsubscribe = sessionStore.subscribe((reason) => {
      queryClient.removeQueries({ queryKey: ['private'] })
      queryClient.removeQueries({ queryKey: ['session'] })
      queryClient.removeQueries({ queryKey: ['favorites'] })
      eventGate.reset()
      userIdRef.current = null
      void realtime.connect(sessionStore.getToken(), handlers)

      if (reason === 'expired') {
        toast.warning('Sessão expirada', { description: 'Entre novamente para continuar de onde parou.', id: 'session-expired' })
        announce('Sua sessão expirou. Entre novamente para continuar.', 'assertive')
      }
      void router.invalidate()
    })
    return () => {
      unsubscribe()
      realtime.disconnect()
    }
  }, [queryClient, router])

  // Mantém o cache da sessão coerente se o usuário mudar em outra aba.
  useEffect(() => {
    if (session.status === 'authenticated') {
      queryClient.setQueryDefaults(qk.private(session.user.id), { staleTime: 15_000 })
    }
  }, [session, queryClient])

  return null
}
