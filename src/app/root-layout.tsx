import { HeadContent, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MobileSearchDialog, MobileTabBar, useShowsTabBar } from '@/components/layout/mobile-bars'
import { LiveRegion } from '@/components/common/live-region'
import { Toaster } from '@/components/ui/sonner'
import { ConnectionIndicator } from '@/realtime/connection-indicator'
import { SessionEffects } from './session-effects'

const MockPanel = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/panel/mock-panel')) : null

export function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const mainRef = useRef<HTMLElement>(null)
  const previous = useRef(pathname)
  const showsTabBar = useShowsTabBar()
  const [searchOpen, setSearchOpen] = useState(false)
 
  const ownMobileTop = pathname === '/' || /^\/(nft|cart|checkout|login|register)(\/|$)/.test(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <>
      <HeadContent />
      <a
        href="#conteudo"
        className="sr-only z-[100] rounded-md bg-primary px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <SessionEffects />
      <Header className={ownMobileTop ? 'max-md:hidden' : undefined} />
      <main id="conteudo" ref={mainRef} tabIndex={-1} className="min-h-svh outline-none">
        <Outlet />
      </main>
      <Footer className={ownMobileTop && pathname !== '/' ? 'max-md:hidden' : undefined} />
      {showsTabBar && <MobileTabBar onSearch={() => setSearchOpen(true)} />}
      <MobileSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <ConnectionIndicator />
      <LiveRegion />
      <Toaster />
      {MockPanel && (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      )}
    </>
  )
}
