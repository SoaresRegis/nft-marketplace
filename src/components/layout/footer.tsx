import { cn } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { newsletterInput } from '@/api/contracts'
import { api } from '@/api/endpoints'
import type { ApiError } from '@/api/errors'
import { announce } from '@/components/common/live-region'
import { SOCIALS } from '@/components/common/social-icons'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

type FooterLink = { label: string; to: '/' | '/account/profile' | '/account/favorites' | '/orders' | '/account/wallets'; search?: Record<string, string>; hash?: string }

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/account/profile' },
      { label: 'Minha coleção', to: '/orders' },
      { label: 'Atividade', to: '/orders' },
      { label: 'Estúdio do criador', to: '/', hash: 'criadores' },
      { label: 'Lista de interesse', to: '/account/favorites' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda', to: '/', hash: 'aprenda' },
      { label: 'Como comprar NFTs', to: '/', hash: 'aprenda' },
      { label: 'Carteira e segurança', to: '/account/wallets' },
      { label: 'Política do mercado', to: '/', hash: 'aprenda' },
      { label: 'Denunciar item', to: '/', hash: 'aprenda' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', to: '/', search: { category: 'digital-art' }, hash: 'catalogo' },
      { label: 'Fotografia', to: '/', search: { category: 'photography' }, hash: 'catalogo' },
      { label: 'Música', to: '/', search: { category: 'music' }, hash: 'catalogo' },
      { label: 'Arte 3D', to: '/', search: { category: '3d' }, hash: 'catalogo' },
      { label: 'Utilidade', to: '/', search: { category: 'utility' }, hash: 'catalogo' },
    ],
  },
]


const linkClass = 'rounded-sm outline-none transition-colors hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring'

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('container-page pb-[calc(1.5rem+var(--bottom-bar,0px))]', className)}>
      <div className="bg-card">
        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.45fr] lg:gap-0 lg:px-12 lg:py-6">
          {FEATURES.map((f, i) => (
            <div key={f.letter} className={i > 0 ? 'lg:border-l lg:border-primary lg:pl-4' : ''}>
              <div className="flex flex-col gap-3 lg:pl-0">
                <span className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground" aria-hidden="true">
                  {f.letter}
                </span>
                <h2 className="text-[17px] font-bold">{f.title}</h2>
                <p className="max-w-[220px] text-[15px] leading-[22px] text-caption">{f.text}</p>
              </div>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid gap-3 bg-band px-6 py-6 text-[15px] sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:px-8">
          <p className="font-bold tracking-[0.08em] uppercase">Kurio</p>
          <p className="max-w-[250px] leading-[22px]">Feito para colecionadores, criadores e cultura</p>
          <p>
            <span className="sr-only">E-mail: </span>contato@email.com
          </p>
          <p>
            <span className="sr-only">Telefone: </span>+55 11 4002 8922
          </p>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {LINK_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
              <h2 className="mb-1 text-xl font-bold">{col.title}</h2>
              <ul className="flex flex-col gap-2 text-[15px] leading-[22px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} search={l.search} hash={l.hash} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="flex flex-col gap-3">
            <h2 className="mb-1 text-xl font-bold">Redes sociais</h2>
            <ul className="flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-8 place-items-center rounded-sm border border-primary text-primary outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                      <path d={s.path} />
                    </svg>
                    <span className="sr-only">{s.label} (abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
            <h2 className="mt-3 text-xl font-bold">Carteiras compatíveis</h2>
            <p className="self-start rounded-md border border-primary/40 bg-band/40 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-highlight uppercase">
              MetaMask <span aria-hidden="true">·</span> WalletConnect <span aria-hidden="true">·</span> Coinbase
            </p>
          </div>
        </div>
      </div>
      <p className="pt-5 text-center text-base">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function Newsletter() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const subscribe = useMutation<{ email: string }, ApiError, string>({
    mutationFn: (value) => api.subscribeNewsletter(value),
    onSuccess: (res) => {
      const msg = `Pronto! ${res.email} vai receber os próximos lançamentos.`
      setDone(msg)
      setEmail('')
      toast.success('Inscrição confirmada', { description: msg })
      announce(msg)
    },
    onError: (e) => setError(e.fields?.email ?? e.message),
  })

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:border-l lg:border-primary lg:pl-4">
      <h2 id={`${id}-title`} className="text-lg leading-[18px] font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <form
        noValidate
        aria-labelledby={`${id}-title`}
        className="flex"
        onSubmit={(e) => {
          e.preventDefault()
          setDone(null)
          const parsed = newsletterInput.safeParse({ email })
          if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'E-mail inválido')
          setError(null)
          subscribe.mutate(parsed.data.email)
        }}
      >
        <label htmlFor={`${id}-email`} className="sr-only">
          E-mail
        </label>
        <input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          placeholder="digite seu e-mail..."
          autoComplete="email"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="h-10 min-w-0 flex-1 rounded-l-sm bg-background px-3 text-base text-foreground placeholder:text-caption/80 outline-none focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive"
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="h-10 rounded-r-sm bg-primary px-4 text-lg font-bold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-60"
        >
          {subscribe.isPending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive" data-testid="newsletter-error">
          {error}
        </p>
      ) : done ? (
        <p role="status" className="text-sm text-success" data-testid="newsletter-success">
          {done}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-sm leading-[22px] text-caption">
          Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
        </p>
      )}
    </div>
  )
}
