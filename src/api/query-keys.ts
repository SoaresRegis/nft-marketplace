import type { NftListParams } from './contracts'

/**
 * Chaves de cache. Dados privados ficam sob ['private', userId, ...] e o
 * carrinho do visitante sob ['guest', cartId, ...]. Assim o logout/troca de
 * usuário remove tudo de uma vez e nenhum dado vaza entre sessões.
 */
export type Viewer = { kind: 'user'; userId: string } | { kind: 'guest'; cartId: string | null }

export const qk = {
  session: (token: string | null) => ['session', token] as const,
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    featured: ['nfts', 'featured'] as const,
    details: ['nfts', 'detail'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  private: (userId: string) => ['private', userId] as const,
  favorites: (userId: string) => ['private', userId, 'favorites'] as const,
  scope: (viewer: Viewer) =>
    viewer.kind === 'user' ? (['private', viewer.userId] as const) : (['guest', viewer.cartId ?? 'none'] as const),
  cart: (viewer: Viewer) => [...qk.scope(viewer), 'cart'] as const,
  quote: (viewer: Viewer, network: string) => [...qk.scope(viewer), 'quote', network] as const,
  quotes: (viewer: Viewer) => [...qk.scope(viewer), 'quote'] as const,
  orders: (userId: string) => ['private', userId, 'orders'] as const,
  order: (userId: string, orderId: string) => ['private', userId, 'orders', orderId] as const,
  profile: (userId: string) => ['private', userId, 'profile'] as const,
  wallets: (userId: string) => ['private', userId, 'wallets'] as const,
}
