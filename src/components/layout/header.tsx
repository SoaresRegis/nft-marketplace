import { Link, useLocation, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, LogIn, LogOut, Menu, Receipt, Search, ShoppingCart, User, Wallet, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSession } from '@/features/auth/use-session'
import { useLogout } from '@/features/auth/use-auth-mutations'
import { useCart } from '@/features/cart/use-cart'
import { SearchBox } from '@/features/catalog/search-box'
import { UserAvatar } from '@/components/common/user-avatar'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

/** Navegação principal do layout. "Mercado", "Criadores" e "Aprenda" levam às seções da Início. */
const NAV = [
  { label: 'Início', hash: undefined },
  { label: 'Mercado', hash: 'catalogo' },
  { label: 'Criadores', hash: 'criadores' },
  { label: 'Aprenda', hash: 'aprenda' },
] as const

const navLinkClass =
  'relative flex h-full items-center px-1 text-lg text-foreground outline-none transition-colors hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring'

function useActiveNav() {
  const { pathname, hash } = useLocation()
  // Detalhe, carrinho e checkout fazem parte do Mercado.
  if (/^\/(nft|cart|checkout)/.test(pathname)) return 'Mercado'
  if (pathname !== '/') return null
  return NAV.find((n) => n.hash === (hash || undefined))?.label ?? 'Início'
}

function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const cart = useCart()
  const count = cart.data?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0
  return (
    <Link
      to="/cart"
      className="relative grid size-10 place-items-center rounded-md text-foreground outline-none transition-colors hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
      onClick={onNavigate}
      aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
    >
      <ShoppingCart className="size-6" strokeWidth={1.75} aria-hidden="true" />
      {count > 0 && (
        <span
          data-testid="cart-count"
          className="absolute top-0.5 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground"
        >
          {count}
        </span>
      )}
    </Link>
  )
}

/** Busca no cabeçalho: abre um campo logo abaixo da barra; o resultado aparece no Mercado. */
function HeaderSearch({ open }: { open: boolean }) {
  const navigate = useNavigate()
  const onHome = useRouterState({ select: (s) => s.location.pathname === '/' })
  const q = useRouterState({ select: (s) => (s.location.pathname === '/' ? ((s.location.search as { q?: string }).q ?? '') : '') })

  if (!open) return null
  return (
    <div className="container-page pb-4" id="header-search">
      <SearchBox
        value={q}
        autoFocus
        onSearch={(next, { submit }) =>
          void navigate({
            to: '/',
            search: onHome ? (prev) => ({ ...prev, q: next || undefined, page: undefined }) : { q: next || undefined },
            hash: submit ? 'catalogo' : undefined,
            resetScroll: false,
          })
        }
      />
    </div>
  )
}

export function Header({ className }: { className?: string }) {
  const session = useSession()
  const logout = useLogout()
  const navigate = useNavigate()
  const active = useActiveNav()
  const [menuOpen, setMenuOpen] = useState(false)
  const hasQuery = useRouterState({ select: (s) => s.location.pathname === '/' && !!(s.location.search as { q?: string }).q })
  const [searchOpen, setSearchOpen] = useState(hasQuery)
  const close = () => setMenuOpen(false)

  useEffect(() => {
    if (hasQuery) setSearchOpen(true)
  }, [hasQuery])

  const searchButton = (
    <button
      type="button"
      onClick={() => setSearchOpen((o) => !o)}
      aria-expanded={searchOpen}
      aria-controls="header-search"
      aria-label={searchOpen ? 'Fechar busca' : 'Abrir busca'}
      className="grid size-10 place-items-center rounded-md text-foreground outline-none transition-colors hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {searchOpen ? <X className="size-6" aria-hidden="true" /> : <Search className="size-6" strokeWidth={1.75} aria-hidden="true" />}
    </button>
  )

  return (
    <header className={cn('sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85', className)}>
      <div className="container-page">
        <div className="flex h-[68px] items-center justify-between gap-4 border-b border-line">
          <Logo />
          <nav aria-label="Principal" className="hidden h-full items-stretch gap-10 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to="/"
                hash={n.hash}
                className={cn(navLinkClass, active === n.label && 'text-highlight')}
                aria-current={active === n.label ? 'page' : undefined}
              >
                {n.label}
                {active === n.label && <span className="absolute inset-x-0 -bottom-px h-[3px] bg-primary" aria-hidden="true" />}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 lg:gap-4">
            {searchButton}
            <CartLink />
            <div className="hidden lg:block">
              {session.status === 'authenticated' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="xs" className="ml-1 h-9 gap-2 px-3 text-base" aria-label={`Conta de ${session.user.name}`}>
                      <UserAvatar user={session.user} size={24} />
                      <span className="max-w-32 truncate">{session.user.name.split(' ')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate({ to: '/account/profile' })}>
                      <User aria-hidden="true" /> Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: '/account/wallets' })}>
                      <Wallet aria-hidden="true" /> Carteiras
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: '/account/favorites' })}>
                      <Heart aria-hidden="true" /> Favoritos
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: '/orders' })}>
                      <Receipt aria-hidden="true" /> Pedidos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => logout.mutate()}>
                      <LogOut aria-hidden="true" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="xs" className="ml-1 h-[35px] gap-1.5 rounded-sm px-2.5 text-lg font-medium">
                  <Link to="/login" search={{ redirect: undefined }}>
                    <LogIn className="size-5" aria-hidden="true" /> Entrar
                  </Link>
                </Button>
              )}
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-10 rounded-md lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-6" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" aria-describedby="mobile-menu-desc">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription id="mobile-menu-desc">Navegação e conta</SheetDescription>
                </SheetHeader>
                <nav aria-label="Menu móvel" className="flex flex-col gap-1 px-3">
                  {NAV.map((n) => (
                    <Link
                      key={n.label}
                      to="/"
                      hash={n.hash}
                      onClick={close}
                      className={cn('rounded-md px-4 py-3 text-lg outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring', active === n.label && 'text-highlight')}
                    >
                      {n.label}
                    </Link>
                  ))}
                  <Link to="/cart" onClick={close} className="rounded-md px-4 py-3 text-lg outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring">
                    Carrinho
                  </Link>
                  {session.status === 'authenticated' ? (
                    <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                      {(
                        [
                          ['/account/profile', 'Perfil'],
                          ['/account/wallets', 'Carteiras'],
                          ['/account/favorites', 'Favoritos'],
                          ['/orders', 'Pedidos'],
                        ] as const
                      ).map(([to, label]) => (
                        <Link key={to} to={to} onClick={close} className="rounded-md px-4 py-3 text-lg outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring">
                          {label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        className="rounded-md px-4 py-3 text-left text-lg outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
                        onClick={() => {
                          close()
                          logout.mutate()
                        }}
                      >
                        Sair
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col gap-3 px-2">
                      <Button asChild>
                        <Link to="/login" search={{ redirect: undefined }} onClick={close}>
                          <LogIn aria-hidden="true" /> Entrar
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/register" search={{ redirect: undefined }} onClick={close}>
                          Criar conta
                        </Link>
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <HeaderSearch open={searchOpen} />
    </header>
  )
}
