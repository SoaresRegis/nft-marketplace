import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddCartItemInput, Cart } from '@/api/contracts'
import { api } from '@/api/endpoints'
import type { ApiError } from '@/api/errors'
import { qk, type Viewer } from '@/api/query-keys'
import { setGuestCartId } from '@/api/viewer'
import { announce } from '@/components/common/live-region'
import { useViewer } from '@/features/auth/use-session'

export function useCart() {
  const viewer = useViewer()
  const enabled = !!viewer && (viewer.kind === 'user' || !!viewer.cartId)
  return useQuery({
    queryKey: viewer ? qk.cart(viewer) : ['cart', 'pending'],
    queryFn: async ({ signal }) => {
      const cart = await api.getCart({ signal })
     
      if (viewer?.kind === 'guest' && cart.id !== viewer.cartId) setGuestCartId(cart.id)
      return cart
    },
    enabled,
    staleTime: 10_000,
  })
}

function useCartWriter() {
  const queryClient = useQueryClient()
  const viewer = useViewer()
  return {
    viewer,
    write(cart: Cart) {
      let target: Viewer | null = viewer
      if (viewer?.kind === 'guest' && viewer.cartId !== cart.id) {
        setGuestCartId(cart.id)
        target = { kind: 'guest', cartId: cart.id }
      }
      if (target) {
        const current = queryClient.getQueryData<Cart>(qk.cart(target))
        if (current && current.id === cart.id && current.version > cart.version) return
        queryClient.setQueryData(qk.cart(target), cart)
        void queryClient.invalidateQueries({ queryKey: qk.quotes(target) })
      }
    },
  }
}

export function useAddToCart() {
  const { write } = useCartWriter()
  return useMutation<Cart, ApiError, AddCartItemInput & { label: string }>({
    mutationFn: ({ label: _label, ...input }) => api.addCartItem(input),
    onSuccess: (cart, vars) => {
      write(cart)
      const msg = `${vars.quantity}× ${vars.label} adicionado ao carrinho.`
      toast.success('Adicionado ao carrinho', { description: msg })
      announce(msg)
    },
  })
}

/** Alteração de quantidade com atualização otimista e rollback. */
export function useUpdateCartQuantity() {
  const queryClient = useQueryClient()
  const { write, viewer } = useCartWriter()
  return useMutation<Cart, ApiError, { itemId: string; quantity: number }, { previous?: Cart }>({
    mutationFn: ({ itemId, quantity }) => api.updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      if (!viewer) return {}
      const key = qk.cart(viewer)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) {
        queryClient.setQueryData<Cart>(key, {
          ...previous,
          items: previous.items.map((i) => (i.id === itemId ? { ...i, quantity, exceedsAvailability: quantity > i.available } : i)),
        })
      }
      return { previous }
    },
    onError: (error, _vars, ctx) => {
      if (viewer && ctx?.previous) queryClient.setQueryData(qk.cart(viewer), ctx.previous)
      toast.error('Não foi possível alterar a quantidade', { description: error.message })
      announce(`Erro: ${error.message}`, 'assertive')
    },
    onSuccess: (cart) => {
      write(cart)
      announce('Quantidade atualizada.')
    },
  })
}

export function useRemoveCartItem() {
  const { write } = useCartWriter()
  return useMutation<Cart, ApiError, { itemId: string; label: string }>({
    mutationFn: ({ itemId }) => api.removeCartItem(itemId),
    onSuccess: (cart, vars) => {
      write(cart)
      announce(`${vars.label} removido do carrinho.`)
      toast.success('Item removido', { description: vars.label })
    },
    onError: (error) => toast.error('Não foi possível remover o item', { description: error.message }),
  })
}

export function useApplyCoupon() {
  const { write } = useCartWriter()
  return useMutation<Cart, ApiError, string>({
    mutationFn: (code) => api.applyCoupon(code),
    onSuccess: (cart) => {
      write(cart)
      announce(`Cupom ${cart.couponCode} aplicado.`)
    },
  })
}

export function useRemoveCoupon() {
  const { write } = useCartWriter()
  return useMutation<Cart, ApiError, void>({
    mutationFn: () => api.removeCoupon(),
    onSuccess: (cart) => {
      write(cart)
      announce('Cupom removido.')
    },
  })
}

export function useAcknowledgeCart() {
  const { write } = useCartWriter()
  return useMutation<Cart, ApiError, void>({
    mutationFn: () => api.acknowledgeCartChanges(),
    onSuccess: (cart) => {
      write(cart)
      announce('Alterações do carrinho confirmadas.')
    },
  })
}
