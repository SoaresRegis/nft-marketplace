import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { LoginInput, RegisterInput, Session } from '@/api/contracts'
import { api } from '@/api/endpoints'
import { qk } from '@/api/query-keys'
import { sessionStore } from '@/api/session-store'
import { setGuestCartId } from '@/api/viewer'
import { announce } from '@/components/common/live-region'
import { clearCheckoutDrafts } from '@/features/checkout/draft'

export function safeRedirect(redirect: string | undefined) {
  if (!redirect) return '/'
  try {
    const url = new URL(redirect, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/register')) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

function useCompleteLogin() {
  const queryClient = useQueryClient()
  return async (session: Session) => {
    const guestCartId = sessionStore.getGuestCartId()
    sessionStore.setToken(session.token, 'login')
    queryClient.setQueryData(qk.session(session.token), { user: session.user, expiresAt: session.expiresAt })
    if (guestCartId) {
      try {
        const merged = await api.mergeGuestCart(guestCartId)
        queryClient.setQueryData(qk.cart({ kind: 'user', userId: session.user.id }), merged)
      } catch {
        toast.error('Não foi possível trazer os itens do carrinho de visitante.')
      } finally {
        setGuestCartId(null)
        queryClient.removeQueries({ queryKey: ['guest'] })
      }
    }
  }
}

export function useLogin() {
  const complete = useCompleteLogin()
  return useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: async (session) => {
      await complete(session)
      announce(`Bem-vindo, ${session.user.name}.`)
    },
  })
}

export function useRegister() {
  const complete = useCompleteLogin()
  return useMutation({
    mutationFn: ({ confirmPassword: _ignored, ...input }: RegisterInput) => api.register(input),
    onSuccess: async (session) => {
      await complete(session)
      announce('Conta criada com sucesso.')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async () => {
      try {
        await api.logout()
      } catch {
        /* encerra localmente mesmo se a API falhar */
      }
    },
    onSettled: () => {
      clearCheckoutDrafts()
      sessionStore.setToken(null, 'logout')
      toast.success('Você saiu da sua conta.')
      void navigate({ to: '/' })
    },
  })
}
