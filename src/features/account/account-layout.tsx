import { Link, Outlet } from '@tanstack/react-router'
import { CircleAlert, Download, Heart, LogOut, MapPin, ShoppingCart, Tag, User } from 'lucide-react'
import { useLogout } from '@/features/auth/use-auth-mutations'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/account/profile', label: 'Dados do perfil', icon: User },
  { to: '/account/wallets', label: 'Carteiras', icon: MapPin },
  { to: '/account/activity', label: 'Atividade', icon: ShoppingCart },
  { to: '/account/favorites', label: 'Lista de interesse', icon: Heart },
  { to: '/account/offers', label: 'Ofertas', icon: Tag },
  { to: '/account/downloads', label: 'Arquivos baixados', icon: Download },
  { to: '/account/support', label: 'Suporte', icon: CircleAlert },
] as const

const itemClass =
  'relative flex items-center gap-3 px-4 py-3 text-[15px] text-highlight outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset'

export function AccountLayout() {
  const logout = useLogout()
  const session = useSession()
  return (
    <div className="container-page grid gap-8 pt-8 pb-16 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-7 lg:pb-24">
      <aside className="h-fit min-w-0 bg-card">
        <h1 className="px-2.5 pt-4 pb-2 text-lg font-bold">Meu perfil</h1>
        {session.status === 'authenticated' && (
          <p className="truncate px-2.5 pb-3 text-[13px] text-caption" data-testid="account-user">
            {session.user.name}
          </p>
        )}
        <nav aria-label="Meu perfil">
          <ul className="flex flex-col max-lg:flex-row max-lg:overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to} className="shrink-0">
                <Link
                  to={to}
                  className={cn(itemClass, 'data-[status=active]:before:absolute data-[status=active]:before:inset-y-0 data-[status=active]:before:left-0 data-[status=active]:before:w-1.5 data-[status=active]:before:bg-primary')}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border">
          <button type="button" onClick={() => logout.mutate()} className={cn(itemClass, 'w-full font-bold')} disabled={logout.isPending}>
            <LogOut className="size-5" strokeWidth={1.5} aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
