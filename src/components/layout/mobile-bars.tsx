import { Link, useCanGoBack, useLocation, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSession } from '@/features/auth/use-session'
import { SearchBox } from '@/features/catalog/search-box'
import { useCart } from '@/features/cart/use-cart'
import { useBottomBarOffset } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

export const roundButtonClass =
  'grid size-[34px] shrink-0 place-items-center rounded-full border border-line-soft bg-surface-2 text-strike outline-none transition-colors hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring'

export function BackButton({ fallback = '/', label = 'Voltar', className }: { fallback?: string; label?: string; className?: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(roundButtonClass, className)}
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: fallback }))}
    >
      <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
    </button>
  )
}

export function MobileTopBar({ title, fallback, right, titleId }: { title: string; fallback?: string; right?: ReactNode; titleId?: string }) {
  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)_34px] items-center gap-3 pt-8 pb-4 md:hidden">
      <BackButton fallback={fallback} />
      <h1 id={titleId} className="truncate text-center text-xl font-bold tracking-[0.02em]">
        {title}
      </h1>
      <div className="flex justify-end">{right}</div>
    </div>
  )
}

const NO_TAB_BAR = /^\/(nft|cart|checkout|login|register)(\/|$)/

export function useShowsTabBar() {
  const { pathname } = useLocation()
  return !NO_TAB_BAR.test(pathname)
}

export function MobileTabBar({ onSearch }: { onSearch: () => void }) {
  const { pathname } = useLocation()
  const session = useSession()
  const cart = useCart()
  const count = cart.data?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0
  const ref = useBottomBarOffset<HTMLElement>()
  const authed = session.status === 'authenticated'

  const item = (to: string, label: string, icon: ReactNode, active: boolean, extra?: ReactNode) => (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative grid size-12 place-items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring',
        active ? 'text-highlight' : 'text-caption hover:text-foreground',
      )}
    >
      {icon}
      {extra}
    </Link>
  )

  return (
    <nav
      ref={ref}
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      data-testid="mobile-tab-bar"
    >
      <div className="relative mx-auto max-w-[480px] rounded-t-[30px] bg-surface-2 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.35)]">
        <div className="grid grid-cols-5 items-center justify-items-center">
          {item('/', 'Início', <House className="size-6" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />, pathname === '/')}
          {item(
            authed ? '/account/favorites' : '/login',
            'Favoritos',
            <Heart className="size-6" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />,
            pathname.startsWith('/account/favorites'),
          )}
          <div className="relative -mt-12 grid size-[74px] place-items-center rounded-full bg-background">
            <button
              type="button"
              onClick={onSearch}
              aria-label="Buscar NFTs"
              className="grid size-16 place-items-center rounded-full bg-[linear-gradient(180deg,rgb(210_138_76/0.55),#d28a4c)] text-foreground shadow-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <ScanLine className="size-7" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          {item(
            '/cart',
            `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`,
            <ShoppingCart className="size-6" strokeWidth={1.75} aria-hidden="true" />,
            false,
            count > 0 && (
              <span
                data-testid="cart-count"
                className="absolute top-1 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground"
              >
                {count}
              </span>
            ),
          )}
          {item(
            authed ? '/account/profile' : '/login',
            authed ? `Conta de ${session.user.name}` : 'Entrar',
            <User className="size-6" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />,
            pathname.startsWith('/account') && !pathname.startsWith('/account/favorites'),
          )}
        </div>
      </div>
    </nav>
  )
}

export function MobileSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-6 translate-y-0 gap-4 p-5" aria-describedby="mobile-search-desc">
        <DialogHeader>
          <DialogTitle className="text-xl">Buscar NFTs</DialogTitle>
          <DialogDescription id="mobile-search-desc">Procure por nome, criador ou tag.</DialogDescription>
        </DialogHeader>
        <SearchBox
          value=""
          autoFocus
          placeholder="Explorar coleções"
          onSearch={(q, { submit }) => {
            if (!submit) return
            onOpenChange(false)
            void router.navigate({ to: '/', search: { q: q || undefined }, hash: 'catalogo' })
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

export function useMobileSubmitBar() {
  return useBottomBarOffset<HTMLDivElement>()
}
