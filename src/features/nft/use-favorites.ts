import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Favorites } from '@/api/contracts'
import { api } from '@/api/endpoints'
import type { ApiError } from '@/api/errors'
import { qk } from '@/api/query-keys'
import { announce } from '@/components/common/live-region'
import { useSession } from '@/features/auth/use-session'

export function useFavorites() {
  const session = useSession()
  const userId = session.status === 'authenticated' ? session.user.id : null
  return useQuery({
    queryKey: userId ? qk.favorites(userId) : ['favorites', 'anonymous'],
    queryFn: ({ signal }) => api.getFavorites({ signal }),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

/**
 * Favoritar com atualização otimista: a UI muda na hora; se a API falhar,
 * o estado anterior é restaurado e o usuário é avisado.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const session = useSession()
  const userId = session.status === 'authenticated' ? session.user.id : null
  return useMutation<Favorites, ApiError, { nftId: string; name: string; favorite: boolean }, { previous?: Favorites }>({
    mutationKey: ['favorite-toggle'],
    mutationFn: ({ nftId, favorite }) => (favorite ? api.addFavorite(nftId) : api.removeFavorite(nftId)),
    onMutate: async ({ nftId, favorite }) => {
      if (!userId) return {}
      const key = qk.favorites(userId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      const ids = new Set(previous?.nftIds ?? [])
      if (favorite) ids.add(nftId)
      else ids.delete(nftId)
      queryClient.setQueryData<Favorites>(key, { nftIds: [...ids] })
      return { previous }
    },
    onError: (error, vars, ctx) => {
      if (userId) queryClient.setQueryData(qk.favorites(userId), ctx?.previous)
      const msg = vars.favorite ? `Não foi possível favoritar ${vars.name}.` : `Não foi possível remover ${vars.name} dos favoritos.`
      toast.error(msg, { description: error.message })
      announce(`${msg} ${error.message}`, 'assertive')
    },
    onSuccess: (data, vars) => {
      if (userId) queryClient.setQueryData(qk.favorites(userId), data)
      announce(vars.favorite ? `${vars.name} adicionado aos favoritos.` : `${vars.name} removido dos favoritos.`)
    },
    onSettled: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: qk.favorites(userId) })
    },
  })
}
