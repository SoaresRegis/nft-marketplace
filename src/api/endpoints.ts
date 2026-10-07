/**
 * Funções de acesso à API REST. Todas passam pelo Axios (`request`) e validam
 * a resposta com o contrato correspondente. Recebem `signal` para que o
 * TanStack Query cancele requisições obsoletas.
 */
import { z } from 'zod'
import * as c from './contracts'
import { request } from './http'

type Opts = { signal?: AbortSignal }

const ok = z.object({ ok: z.literal(true) })

/** Timeout menor na criação de pedido: a recuperação é por idempotência. */
export const ORDER_TIMEOUT_MS = 6000

export function serializeListParams(p: c.NftListParams) {
  const params = new URLSearchParams()
  if (p.q) params.set('q', p.q)
  p.category?.forEach((v) => params.append('category', v))
  p.chain?.forEach((v) => params.append('chain', v))
  if (p.minPrice) params.set('minPrice', p.minPrice)
  if (p.maxPrice) params.set('maxPrice', p.maxPrice)
  if (p.availability && p.availability !== 'all') params.set('availability', p.availability)
  if (p.view && p.view !== 'all') params.set('view', p.view)
  if (p.sort) params.set('sort', p.sort)
  if (p.page) params.set('page', String(p.page))
  if (p.pageSize) params.set('pageSize', String(p.pageSize))
  return params
}

export const api = {
  // Sessão e conta
  register: (input: Omit<c.RegisterInput, 'confirmPassword'>) =>
    request(c.session, { method: 'POST', url: '/auth/register', data: input }),
  login: (input: c.LoginInput) => request(c.session, { method: 'POST', url: '/auth/login', data: input }),
  getSession: ({ signal }: Opts = {}) => request(c.sessionInfo, { method: 'GET', url: '/auth/session', signal }),
  logout: () => request(ok, { method: 'POST', url: '/auth/logout' }),

  // NFTs
  listNfts: (params: c.NftListParams, { signal }: Opts = {}) =>
    request(c.nftList, { method: 'GET', url: '/nfts', params: serializeListParams(params), signal }),
  featured: ({ signal }: Opts = {}) => request(c.featuredList, { method: 'GET', url: '/nfts/featured', signal }),
  getNft: (id: string, { signal }: Opts = {}) =>
    request(c.nftDetail, { method: 'GET', url: `/nfts/${encodeURIComponent(id)}`, signal }),

  // Favoritos
  getFavorites: ({ signal }: Opts = {}) => request(c.favorites, { method: 'GET', url: '/me/favorites', signal }),
  addFavorite: (nftId: string) => request(c.favorites, { method: 'PUT', url: `/me/favorites/${encodeURIComponent(nftId)}` }),
  removeFavorite: (nftId: string) =>
    request(c.favorites, { method: 'DELETE', url: `/me/favorites/${encodeURIComponent(nftId)}` }),

  // Carrinho
  getCart: ({ signal }: Opts = {}) => request(c.cart, { method: 'GET', url: '/cart', signal }),
  addCartItem: (input: c.AddCartItemInput) => request(c.cart, { method: 'POST', url: '/cart/items', data: input }),
  updateCartItem: (itemId: string, quantity: number) =>
    request(c.cart, { method: 'PATCH', url: `/cart/items/${itemId}`, data: { quantity } }),
  removeCartItem: (itemId: string) => request(c.cart, { method: 'DELETE', url: `/cart/items/${itemId}` }),
  acknowledgeCartChanges: () => request(c.cart, { method: 'POST', url: '/cart/acknowledge' }),
  mergeGuestCart: (guestCartId: string) =>
    request(c.cart, { method: 'POST', url: '/cart/merge', data: { guestCartId } }),
  applyCoupon: (code: string) => request(c.cart, { method: 'PUT', url: '/cart/coupon', data: { code } }),
  removeCoupon: () => request(c.cart, { method: 'DELETE', url: '/cart/coupon' }),

  // Cotação
  getQuote: (input: c.QuoteInput, { signal }: Opts = {}) =>
    request(c.quote, { method: 'POST', url: '/quotes', data: input, signal }),

  // Pedidos
  createOrder: (input: c.CreateOrderInput, idempotencyKey: string) =>
    request(c.order, {
      method: 'POST',
      url: '/orders',
      data: input,
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: ORDER_TIMEOUT_MS,
    }),
  getOrder: (id: string, { signal }: Opts = {}) =>
    request(c.order, { method: 'GET', url: `/orders/${encodeURIComponent(id)}`, signal }),
  listOrders: ({ signal }: Opts = {}) => request(c.orderList, { method: 'GET', url: '/orders', signal }),

  // Perfil
  getProfile: ({ signal }: Opts = {}) => request(c.user, { method: 'GET', url: '/me/profile', signal }),
  updateProfile: (input: c.ProfileInput) => request(c.user, { method: 'PATCH', url: '/me/profile', data: input }),
  updateAvatar: (input: c.AvatarInput) => request(c.user, { method: 'PUT', url: '/me/avatar', data: input }),
  removeAvatar: () => request(c.user, { method: 'DELETE', url: '/me/avatar' }),
  changePassword: (input: Omit<c.PasswordChangeInput, 'confirmPassword'>) =>
    request(ok, { method: 'POST', url: '/me/password', data: input }),

  // Newsletter
  subscribeNewsletter: (email: string) => request(c.newsletterSubscription, { method: 'POST', url: '/newsletter', data: { email } }),

  // Carteiras
  listWallets: ({ signal }: Opts = {}) =>
    request(z.object({ items: z.array(c.wallet) }), { method: 'GET', url: '/me/wallets', signal }),
  createWallet: (input: c.WalletInput) => request(c.wallet, { method: 'POST', url: '/me/wallets', data: input }),
  updateWallet: (id: string, input: c.WalletInput) =>
    request(c.wallet, { method: 'PUT', url: `/me/wallets/${id}`, data: input }),
  connectWallet: (id: string, network: c.Network) =>
    request(c.walletConnection, { method: 'POST', url: `/me/wallets/${id}/connect`, data: { network } }),
  disconnectWallet: (id: string) =>
    request(c.walletConnection, { method: 'POST', url: `/me/wallets/${id}/disconnect` }),
}
