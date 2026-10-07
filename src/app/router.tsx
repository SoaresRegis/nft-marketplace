import { createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { sessionStore } from '@/api/session-store'
import { ensureSession } from '@/features/auth/use-session'
import { HomePage } from '@/features/catalog/home-page'
import { catalogSearchSchema, toListParams } from '@/features/catalog/search'
import { NftDetailPage } from '@/features/nft/nft-detail-page'
import { featuredQuery, nftDetailQuery, nftListQuery } from '@/features/catalog/queries'
import { RootLayout } from './root-layout'
import { NotFoundPage } from './not-found'

export interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

/** Guard de rotas privadas: sem sessão válida, vai ao login guardando o destino. */
async function requireAuth({ context, location }: { context: RouterContext; location: { href: string } }) {
  const hadToken = !!sessionStore.getToken() || sessionStore.getLastReason() === 'expired'
  const session = await ensureSession(context.queryClient)
  if (!session) {
    throw redirect({ to: '/login', search: { redirect: location.href, reason: hadToken ? 'expired' : undefined } })
  }
  return { session }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Dispara as consultas assim que a rota resolve, antes da renderização.
    void context.queryClient.prefetchQuery(featuredQuery())
    void context.queryClient.prefetchQuery(nftListQuery(toListParams(deps)))
  },
  component: HomePage,
  head: () => ({ meta: [{ title: 'Kurio | Marketplace de NFTs' }] }),
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  validateSearch: z.object({ edition: z.string().optional().catch(undefined) }),
  loader: ({ context, params }) => {
    // Pré-carrega sem bloquear a navegação (o componente mostra skeleton).
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailPage,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: lazyRouteComponent(() => import('@/features/cart/cart-page'), 'CartPage'),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  validateSearch: z.object({ step: z.enum(['details', 'wallet', 'review']).optional().catch(undefined) }),
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/checkout/checkout-page'), 'CheckoutPage'),
})

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/orders/orders-page'), 'OrdersPage'),
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/orders/order-page'), 'OrderPage'),
})

const authSearch = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: authSearch,
  component: lazyRouteComponent(() => import('@/features/auth/login-page'), 'LoginPage'),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: authSearch,
  component: lazyRouteComponent(() => import('@/features/auth/register-page'), 'RegisterPage'),
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/account/account-layout'), 'AccountLayout'),
})

const accountIndexRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/account/profile' })
  },
})

const profileRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/profile',
  component: lazyRouteComponent(() => import('@/features/account/profile-page'), 'ProfilePage'),
})

const walletsRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/wallets',
  component: lazyRouteComponent(() => import('@/features/account/wallets-page'), 'WalletsPage'),
})

const favoritesRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/favorites',
  component: lazyRouteComponent(() => import('@/features/account/favorites-page'), 'FavoritesPage'),
})

const activityRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/activity',
  component: lazyRouteComponent(() => import('@/features/account/extra-pages'), 'ActivityPage'),
})

const offersRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/offers',
  component: lazyRouteComponent(() => import('@/features/account/extra-pages'), 'OffersPage'),
})

const downloadsRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/downloads',
  component: lazyRouteComponent(() => import('@/features/account/extra-pages'), 'DownloadsPage'),
})

const supportRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: '/support',
  component: lazyRouteComponent(() => import('@/features/account/extra-pages'), 'SupportPage'),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  ordersRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  accountRoute.addChildren([accountIndexRoute, profileRoute, walletsRoute, favoritesRoute, activityRoute, offersRoute, downloadsRoute, supportRoute]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultPendingMs: 400,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
