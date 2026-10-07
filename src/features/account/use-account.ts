import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PasswordChangeInput, ProfileInput, User, Wallet, WalletInput } from '@/api/contracts'
import { api } from '@/api/endpoints'
import type { ApiError } from '@/api/errors'
import { qk } from '@/api/query-keys'
import { sessionStore } from '@/api/session-store'
import { announce } from '@/components/common/live-region'

function syncUser(queryClient: ReturnType<typeof useQueryClient>, userId: string, user: User) {
  queryClient.setQueryData(qk.profile(userId), user)
  // Mantém o cabeçalho/sessão coerentes com o perfil atualizado.
  queryClient.setQueryData(qk.session(sessionStore.getToken()), (old: { user: User; expiresAt: string } | undefined) => (old ? { ...old, user } : old))
}

export function useProfile(userId: string) {
  return useQuery({ queryKey: qk.profile(userId), queryFn: ({ signal }) => api.getProfile({ signal }) })
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, ProfileInput>({
    mutationFn: (input) => api.updateProfile(input),
    onSuccess: (user) => {
      syncUser(queryClient, userId, user)
      toast.success('Perfil atualizado')
      announce('Perfil atualizado com sucesso.')
    },
  })
}

export function useUpdateAvatar(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, string | null>({
    mutationFn: (dataUrl) => (dataUrl ? api.updateAvatar({ dataUrl }) : api.removeAvatar()),
    onSuccess: (user) => {
      syncUser(queryClient, userId, user)
      toast.success(user.avatarUrl ? 'Avatar atualizado' : 'Avatar removido')
      announce(user.avatarUrl ? 'Avatar atualizado.' : 'Avatar removido.')
    },
    onError: (e) => {
      toast.error('Não foi possível salvar o avatar', { description: e.message })
      announce(`Erro ao salvar avatar: ${e.message}`, 'assertive')
    },
  })
}

export function useChangePassword() {
  return useMutation<{ ok: true }, ApiError, PasswordChangeInput>({
    mutationFn: ({ currentPassword, newPassword }) => api.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Senha alterada')
      announce('Senha alterada com sucesso.')
    },
  })
}

export function useSaveWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<Wallet, ApiError, { id?: string; input: WalletInput }>({
    mutationFn: ({ id, input }) => (id ? api.updateWallet(id, input) : api.createWallet(input)),
    onSuccess: (wallet, vars) => {
      void queryClient.invalidateQueries({ queryKey: qk.wallets(userId) })
      toast.success(vars.id ? 'Carteira atualizada' : 'Carteira cadastrada', { description: wallet.label })
      announce(vars.id ? `Carteira ${wallet.label} atualizada.` : `Carteira ${wallet.label} cadastrada.`)
    },
  })
}
