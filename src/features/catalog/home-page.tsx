import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { NftDetail } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/states'
import { formatEth } from '@/lib/money'
import { useIsMobile } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { CatalogSection } from './catalog-section'
import { featuredQuery } from './queries'
import { SearchBox } from './search-box'
import { activeFilterCount, type CatalogSearch } from './search'

export function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersButton = useRef<HTMLButtonElement>(null)
  return (
    <div className="flex flex-col gap-16 pb-16 max-md:gap-6 lg:gap-24 lg:pb-24">
      <MobileTop onFilters={() => setFiltersOpen(true)} buttonRef={filtersButton} />
      <Hero />
      <CatalogSection filtersOpen={filtersOpen} onFiltersOpenChange={setFiltersOpen} returnFocusRef={filtersButton} />
      <Highlights />
      <Journal />
    </div>
  )
}

function MobileTop({ onFilters, buttonRef }: { onFilters: () => void; buttonRef: React.RefObject<HTMLButtonElement | null> }) {
  
  const search = useSearch({ strict: false }) as CatalogSearch
  const navigate = useNavigate({ from: '/' })
  const count = activeFilterCount(search)
  return (
    <div className="container-page -mb-2 flex items-center gap-2 pt-10 md:hidden">
      <SearchBox
        variant="pill"
        placeholder="Explorar coleções"
        value={search.q ?? ''}
        className="min-w-0 flex-1"
        onSearch={(q, { submit }) =>
          void navigate({ search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), hash: submit ? 'catalogo' : undefined, resetScroll: false })
        }
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={onFilters}
        aria-label={`Filtros${count ? `, ${count} ativos` : ''}`}
        data-testid="mobile-filters"
        className="relative grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-pill-gradient-soft text-background outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <SlidersHorizontal className="size-5" strokeWidth={2} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-bold text-background">{count}</span>
        )}
      </button>
    </div>
  )
}

const ROTATE_MS = 7000

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

function Hero() {
  const featured = useQuery(featuredQuery())
  const slides = featured.data?.items.slice(0, 3) ?? []
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const current: NftDetail | undefined = slides[index] ?? slides[0]
  const isMobile = useIsMobile()

  // Carrossel dos destaques: avança sozinho, pausa com mouse/foco e respeita "reduzir movimento".
  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [slides.length, paused, reducedMotion])

  const dots =
    slides.length > 1 ? (
      <div role="group" aria-label="Destaques" className="flex gap-2 md:absolute md:right-0 md:bottom-10 lg:bottom-12 max-md:absolute max-md:bottom-1 max-md:left-1/2 max-md:-translate-x-1/2 max-md:gap-0">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Mostrar destaque ${i + 1}: ${s.name}`}
            aria-current={i === index ? 'true' : undefined}
            className={cn(
              'grid size-6 place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
              'before:block before:size-2 before:rounded-full before:transition-all max-md:size-[26px] max-md:before:size-[7px]',
              i === index ? 'before:bg-primary' : 'before:bg-primary/45 hover:before:bg-primary/80 max-md:before:bg-primary',
            )}
          />
        ))}
      </div>
    ) : null

  if (isMobile) {
    const thumb = slides[(index + 1) % Math.max(slides.length, 1)]
    return (
      <section
        aria-labelledby="hero-title"
        className="container-page"
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative isolate grid min-h-[190px] grid-cols-[minmax(0,1fr)_138px] gap-3 overflow-hidden rounded-[30px] bg-mobile-hero py-2.5 pr-4 pl-4 xs:pl-6">
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute -top-10 left-[32%] -z-10 size-[260px]" aria-hidden="true">
            <defs>
              <linearGradient id="hero-orb" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0" stopColor="#dd9a5f" stopOpacity="0.4" />
                <stop offset="1" stopColor="#d28a4c" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="100" fill="url(#hero-orb)" />
          </svg>
          <div className="flex min-w-0 flex-col justify-center gap-1.5 pb-5">
            <p className="text-xs tracking-[0.04em]">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="text-[17px] leading-[1.6] font-bold tracking-[0.06em] uppercase">
              Seja dono da cultura digital
            </h1>
            <p className="text-[11px] leading-[1.6] tracking-[0.04em] text-caption">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <a
              href="#catalogo"
              className="mt-0.5 inline-flex items-center gap-2 self-start rounded-sm text-xs font-bold tracking-[0.04em] text-highlight uppercase outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              Explorar <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <div className="relative self-start">
            {featured.isPending ? (
              <Skeleton className="size-[138px] rounded-2xl" />
            ) : current ? (
              <Link
                to="/nft/$nftId"
                params={{ nftId: current.id }}
                search={{ edition: undefined }}
                className="block rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <img
                  key={current.id}
                  src={current.image}
                  alt={`Arte do NFT em destaque ${current.name}`}
                  width={138}
                  height={138}
                  fetchPriority="high"
                  decoding="async"
                  className="size-[138px] rounded-2xl object-cover animate-in fade-in"
                />
              </Link>
            ) : null}
            {thumb && thumb.id !== current?.id && (
              <img
                src={thumb.image}
                alt=""
                width={58}
                height={58}
                loading="lazy"
                decoding="async"
                className="absolute top-[88px] left-[14px] size-[58px] rounded-2xl object-cover shadow-md"
              />
            )}
          </div>
          {dots}
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="hero-title"
      className="container-page grid items-center gap-8 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,450px)] md:gap-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative flex h-full flex-col justify-center gap-5 md:pl-10 lg:justify-start lg:pt-10">
        <p className="text-[15px] tracking-[0.06em]">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="text-[30px] leading-[1.35] font-bold tracking-[0.02em] uppercase md:text-[36px] lg:text-[43px] lg:leading-[70px]">
          Seja dono do futuro <br className="max-sm:hidden" />
          da arte digital
        </h1>
        <p className="max-w-[560px] text-sm leading-6 text-caption">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da
          internet.
        </p>
        <Button asChild className="h-10 self-start rounded-sm px-7 text-lg uppercase">
          <a href="#catalogo">Explorar</a>
        </Button>
        {dots}
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-card max-md:mx-auto max-md:max-w-[450px]">
        {featured.isPending ? (
          <Skeleton className="size-full rounded-none" />
        ) : current ? (
          <Link
            to="/nft/$nftId"
            params={{ nftId: current.id }}
            search={{ edition: undefined }}
            className="group block size-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
          >
            <img
              key={current.id}
              src={current.gallery[0]?.src ?? current.image}
              alt={`Arte do NFT em destaque ${current.name}`}
              width={450}
              height={450}
              fetchPriority="high"
              decoding="async"
              className="size-full object-cover transition-transform duration-700 animate-in fade-in group-hover:scale-[1.02]"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent p-5 pt-16 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="font-bold">{current.name}</span>
              <span className="font-bold text-highlight">{formatEth(current.priceEth)}</span>
            </span>
          </Link>
        ) : featured.isError ? (
          <ErrorState className="h-full" message={featured.error.message} onRetry={() => void featured.refetch()} retrying={featured.isFetching} />
        ) : null}
      </div>
    </section>
  )
}

const HIGHLIGHTS = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/art/emerald.webp',
    search: { view: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a próxima geração.',
    image: '/art/baron.webp',
    search: { category: 'digital-art' },
  },
]

function Highlights() {
  return (
    <section aria-label="Coleções em destaque" id="criadores" className="container-page grid scroll-mt-24 max-md:mt-10 gap-[30px] md:grid-cols-2">
      {HIGHLIGHTS.map((h) => (
        <article key={h.title} className="grid min-h-[250px] grid-cols-[minmax(0,0.49fr)_minmax(0,0.51fr)] overflow-hidden rounded-lg bg-card lg:h-[250px]">
          <div className="relative overflow-hidden rounded-2xl">
            <img src={h.image} alt="" width={287} height={250} loading="lazy" decoding="async" className="size-full object-cover" />
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute -bottom-[45%] -left-[30%] size-[110%] text-primary/80" aria-hidden="true">
              <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </svg>
          </div>
          <div className="flex flex-col items-end justify-center gap-3 py-5 pr-5 pl-3 text-right md:pr-8 md:pl-0 lg:-ml-2">
            <h3 className="text-lg leading-6 font-bold">{h.title}</h3>
            <p className="text-sm leading-6 text-caption">{h.text}</p>
            <Button asChild size="xs" className="h-10 gap-2 rounded-sm px-6 text-base font-medium">
              <Link to="/" search={h.search} hash="catalogo">
                Explorar <ArrowRight aria-hidden="true" />
                <span className="sr-only">: {h.title}</span>
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const ARTICLES = [
  {
    date: '12 de setembro',
    minutes: 6,
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/art/baron.webp',
    body: [
      'Um NFT é um registro único numa blockchain que aponta para uma obra digital e para quem a possui. Comprar um NFT transfere esse registro para a sua carteira.',
      'Antes de comprar, confira o contrato, a rede e o criador. Na Kurio, cada página de NFT mostra o padrão do token, o endereço do contrato e as edições disponíveis.',
    ],
  },
  {
    date: '13 de setembro',
    minutes: 2,
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    image: '/art/emerald.webp',
    body: [
      'Selecionamos artistas que lançam com frequência, mantêm comunidades ativas e experimentam com edições limitadas.',
      'Use os filtros de coleção e a aba "Em alta" do mercado para descobrir quem está ganhando destaque nesta semana.',
    ],
  },
  {
    date: '15 de setembro',
    minutes: 3,
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/art/nomad.webp',
    body: [
      'Raridade vem da oferta: uma edição Lendária com 3 cópias é mais escassa que uma Standard com 25.',
      'Procedência é o histórico do token desde a cunhagem. Desconfie de coleções sem criador verificado ou com contrato diferente do anunciado.',
    ],
  },
  {
    date: '15 de setembro',
    minutes: 2,
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/art/beat.webp',
    body: [
      'Nunca compartilhe sua frase de recuperação. Nenhum marketplace legítimo pede essa informação.',
      'Use uma carteira principal para guardar e uma secundária para operações do dia a dia, como a Kurio permite cadastrar no seu perfil.',
    ],
  },
]

function Journal() {
  return (
    <section aria-labelledby="journal-heading" id="aprenda" className="container-page scroll-mt-24 max-md:mt-10">
      <div className="mb-10 text-center">
        <h2 id="journal-heading" className="text-[28px] font-bold md:text-[32px]">Diário da Cunhagem</h2>
        <p className="mt-3 text-base text-caption">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ARTICLES.map((a) => (
          <li key={a.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
              <img src={a.image} alt="" width={268} height={195} loading="lazy" decoding="async" className="h-[195px] w-full object-cover object-top" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm text-caption">
                  {a.date} <span aria-hidden="true">&nbsp;|&nbsp;</span>
                  <span className="sr-only">, </span>Leitura de {a.minutes} min
                </p>
                <h3 className="text-lg leading-6 font-bold">{a.title}</h3>
                <p className="text-sm text-caption">{a.excerpt}</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="mt-auto self-start rounded-sm pt-2 text-sm font-bold text-highlight outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      Ler mais <span aria-hidden="true">→</span>
                      <span className="sr-only">: {a.title}</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{a.title}</DialogTitle>
                      <DialogDescription>
                        {a.date} · Leitura de {a.minutes} min
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 text-caption">
                      {a.body.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
