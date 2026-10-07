import { Link, useNavigate } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { brandPath, BrandIcon } from '@/components/common/social-icons'
import { HomePage } from '@/features/catalog/home-page'
import { useIsMobile } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { safeRedirect } from './use-auth-mutations'

export const authInputClass =
  'text-[13px] max-md:h-[50px] max-md:rounded-[10px] max-md:border-field max-md:bg-transparent max-md:px-4 max-md:text-[15px] max-md:tracking-[0.03em] max-md:focus-visible:border-primary'
export const authSubmitClass = 'mt-3 h-11 w-full rounded-sm text-[15px] max-md:mt-8 max-md:h-[60px] max-md:rounded-[10px] max-md:text-[17px] max-md:font-bold max-md:tracking-[0.04em]'

export function AuthShell({
  mode,
  title,
  mobileTitle = title,
  subtitle,
  redirect,
  children,
}: {
  mode: 'login' | 'register'
  title: string
  mobileTitle?: string
  subtitle: string
  redirect?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const close = () => {
    const to = safeRedirect(redirect)
    void navigate({ to: to.startsWith('/account') || to.startsWith('/checkout') || to.startsWith('/orders') ? '/' : to, replace: true })
  }
  return (
    <>
      {!isMobile && (
        <div inert aria-hidden="true">
          <HomePage />
        </div>
      )}
      <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/40" />
          <DialogPrimitive.Content
            className={cn(
              'fixed z-50 flex flex-col overflow-y-auto outline-none',
              isMobile
                ? 'inset-0 bg-background px-7 pt-[max(6rem,14dvh)] pb-10'
                : 'top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 border-b-[10px] border-primary bg-card pt-12 pb-10 shadow-2xl',
            )}
            data-testid="auth-modal"
          >
            <DialogPrimitive.Title className={isMobile ? 'order-first text-center' : 'sr-only'}>
              {isMobile ? (
                <>
                  <span className="block text-[38px] leading-none font-bold tracking-[0.12em]" aria-hidden="true">
                    KURIO
                  </span>
                  <span className="mt-[min(6rem,12dvh)] block text-[19px] font-bold tracking-[0.04em]">{mobileTitle}</span>
                </>
              ) : (
                title
              )}
            </DialogPrimitive.Title>
            <nav aria-label="Acesso" className="flex items-center justify-center gap-2 text-xl max-md:hidden">
              <Link
                to="/login"
                search={{ redirect }}
                replace
                aria-current={mode === 'login' ? 'page' : undefined}
                className={cn('rounded-sm px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring', mode === 'login' ? 'text-highlight' : 'hover:text-highlight')}
              >
                Entrar
              </Link>
              <span className="h-6 w-px bg-primary" aria-hidden="true" />
              <Link
                to="/register"
                search={{ redirect }}
                replace
                aria-current={mode === 'register' ? 'page' : undefined}
                className={cn('rounded-sm px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring', mode === 'register' ? 'text-highlight' : 'hover:text-highlight')}
              >
                Criar conta
              </Link>
            </nav>
            <DialogPrimitive.Description className="mx-auto mt-10 max-w-[400px] px-6 text-center text-[13px] leading-4 max-md:sr-only">{subtitle}</DialogPrimitive.Description>
            <div className="mx-auto mt-6 flex w-full max-w-[340px] flex-col gap-3 px-1 max-md:mt-10 max-md:max-w-[420px] max-md:gap-4 max-md:px-0">{children}</div>
            <SocialLogin />
            {isMobile && (
              <p className="mt-auto pt-10 text-center text-[15px] tracking-[0.04em] text-caption">
                {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
                <Link
                  to={mode === 'login' ? '/register' : '/login'}
                  search={{ redirect }}
                  replace
                  className="rounded-sm text-caption outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {mode === 'login' ? 'Crie uma conta' : 'Entre'}
                </Link>
              </p>
            )}
            <DialogPrimitive.Close className="absolute top-3 right-4 grid size-8 place-items-center rounded-sm text-highlight outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring max-md:top-6 max-md:right-auto max-md:left-6 max-md:size-[34px] max-md:rounded-full max-md:border max-md:border-line-soft max-md:bg-surface-2">
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

const GOOGLE = (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z" />
  </svg>
)

/** Botões sociais do layout. Não há provedor OAuth na demonstração: o clique explica isso. */
function SocialLogin() {
  const [notice, setNotice] = useState<string | null>(null)
  const providers = [
    { name: 'Google', icon: GOOGLE },
    { name: 'Facebook', icon: <BrandIcon path={brandPath('Facebook')} className="size-5 text-[#1877F2]" /> },
  ]
  return (
    <div className="mt-6 flex flex-col max-md:mt-12">
      <p className="flex items-center gap-3 text-[13px] before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border max-md:text-[13px] max-md:tracking-[0.04em] max-md:before:bg-line-soft max-md:after:bg-line-soft">Ou continue com</p>
      <div className="mx-auto mt-3 flex w-full max-w-[340px] flex-col gap-3 px-1 max-md:mt-5 max-md:max-w-[420px] max-md:gap-4 max-md:px-0">
        {providers.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setNotice(`Entrar com ${p.name} não está disponível nesta demonstração. Use e-mail e senha.`)}
            className="flex h-10 items-center justify-center gap-2 border border-border text-[13px] text-caption outline-none hover:border-caption focus-visible:ring-[3px] focus-visible:ring-ring max-md:rounded-[6px] max-md:border-line-soft max-md:gap-3 max-md:text-[14px] max-md:tracking-[0.04em]"
          >
            {p.icon}
            Continuar com {p.name}
          </button>
        ))}
        <p role="status" className="text-center text-xs text-caption empty:hidden">
          {notice}
        </p>
      </div>
    </div>
  )
}
