import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { EmptyState, ErrorState } from '@/components/common/states'
import { catalogViews, sortOptions, type SortOption } from '@/api/contracts'
import { cn } from '@/lib/utils'
import { NftCard, NftCardSkeleton } from './nft-card'
import { FilterPanel } from './filter-panel'
import { Pagination } from './pagination'
import { nftListQuery } from './queries'
import { FeaturedOffer } from './featured-offer'
import { activeFilterCount, PAGE_SIZE, SORT_LABELS, toListParams, VIEW_LABELS, type CatalogSearch } from './search'

export function CatalogSection({
  filtersOpen: openProp,
  onFiltersOpenChange,
  returnFocusRef,
}: { filtersOpen?: boolean; onFiltersOpenChange?: (open: boolean) => void; returnFocusRef?: React.RefObject<HTMLButtonElement | null> } = {}) {

  const search = useSearch({ strict: false }) as CatalogSearch
  const navigate = useNavigate({ from: '/' })
  const params = toListParams(search)
  const query = useQuery(nftListQuery(params))
  const filterCount = activeFilterCount(search)
  const [openState, setOpenState] = useState(false)

  const filtersOpen = openProp ?? openState
  const setFiltersOpen = (open: boolean) => {
    setOpenState(open)
    onFiltersOpenChange?.(open)
  }
  const headingRef = useRef<HTMLHeadingElement>(null)

  /** Qualquer mudança de filtro/busca/ordenação reinicia a paginação. */
  const update = (patch: Partial<CatalogSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), resetScroll: false })

  const goToPage = (page: number) => {
    void navigate({ search: (prev) => ({ ...prev, page: page > 1 ? page : undefined }), resetScroll: false })
    headingRef.current?.scrollIntoView({ block: 'start' })
    headingRef.current?.focus({ preventScroll: true })
  }

  const clearAll = () => navigate({ search: { q: search.q, view: search.view, sort: search.sort }, resetScroll: false })

  const data = query.data
  const facets = data?.facets
  const showSkeleton = query.isPending
  const refreshing = query.isFetching && !query.isPending
  const view = search.view ?? 'all'

  return (
    <section aria-labelledby="catalog-heading" className="container-page scroll-mt-24" id="catalogo">
      <h2 ref={headingRef} tabIndex={-1} id="catalog-heading" className="sr-only scroll-mt-24">
        Mercado{search.q ? `: resultados para “${search.q}”` : ''}
      </h2>

      <div className="grid gap-12 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside aria-label="Filtros" className="hidden flex-col gap-6 lg:flex">
          <FilterPanel search={search} facets={facets} onChange={update} onClear={clearAll} />
          <FeaturedOffer />
        </aside>

        <div className="flex min-w-0 flex-col gap-8 max-md:gap-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div role="group" aria-label="Exibir" className="no-scrollbar flex gap-x-5 gap-y-2 max-md:gap-x-3 max-md:-mx-6 max-md:w-[calc(100%+3rem)] max-md:overflow-x-auto max-md:px-6 max-md:whitespace-nowrap md:flex-wrap">
              {catalogViews.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => update({ view: v === 'all' ? undefined : v })}
                  className={cn(
                    'shrink-0 border-b-2 pb-0.5 text-[15px] font-medium outline-none max-md:text-[14px] max-md:tracking-[0.03em] transition-colors hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring',
                    view === v ? 'border-highlight text-highlight' : 'border-transparent text-foreground',
                  )}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-3 max-lg:w-full max-lg:justify-between max-md:hidden">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="xs" className="h-10 px-4 lg:hidden" aria-label={`Filtros${filterCount ? `, ${filterCount} ativos` : ''}`}>
                    <SlidersHorizontal aria-hidden="true" /> Filtros
                    {filterCount > 0 && <Badge className="px-2 py-0">{filterCount}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  aria-describedby="filters-desc"
                  onCloseAutoFocus={(e) => {
                    // Aberto pelo botão da Início mobile: o foco volta para ele, não para o gatilho oculto.
                    if (returnFocusRef?.current && returnFocusRef.current.offsetParent !== null) {
                      e.preventDefault()
                      returnFocusRef.current.focus()
                    }
                  }}
                >
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription id="filters-desc">Os resultados são atualizados a cada alteração.</SheetDescription>
                  </SheetHeader>
                  <div className="shrink-0 px-2">
                    <div className="px-3 pb-4 md:hidden">
                      <SortSelect value={search.sort ?? 'recent'} onChange={(sort) => update({ sort: sort === 'recent' ? undefined : sort })} bordered />
                    </div>
                    <FilterPanel search={search} facets={facets} onChange={update} onClear={clearAll} className="px-3 py-2" />
                    <div className="sticky bottom-0 bg-background px-3 pt-4 pb-6">
                      <Button className="w-full" onClick={() => setFiltersOpen(false)}>
                        Ver {data?.total ?? ''} resultados
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <SortSelect value={search.sort ?? 'recent'} onChange={(sort) => update({ sort: sort === 'recent' ? undefined : sort })} />
            </div>
          </div>

          <p className="sr-only" aria-live="polite" data-testid="results-count">
            {data ? `${data.total} ${data.total === 1 ? 'resultado' : 'resultados'}` : 'Carregando resultados…'}
            {refreshing ? ', atualizando' : ''}
          </p>
          {search.q && (
            <p className="-mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
              <span>
                Resultados para <strong className="text-foreground">“{search.q}”</strong>
              </span>
              <button
                type="button"
                onClick={() => update({ q: undefined })}
                className="inline-flex items-center gap-1 rounded-sm text-sm text-highlight outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" /> Limpar busca
              </button>
              {refreshing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            </p>
          )}

          {query.isError && !data ? (
            <ErrorState
              title="Não foi possível carregar o catálogo"
              message={query.error.message}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : showSkeleton ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-[34px] md:gap-y-16" aria-busy="true" aria-label="Carregando NFTs">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <NftCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="Nenhum NFT encontrado"
              message={data.total > 0 ? 'Esta página não existe mais. Volte para a primeira página.' : 'Tente outros termos ou remova alguns filtros.'}
              action={
                data.total > 0 ? (
                  <Button variant="outline" onClick={() => goToPage(1)}>Ir para a primeira página</Button>
                ) : filterCount > 0 || search.q || search.view ? (
                  <Button variant="outline" onClick={() => navigate({ search: {}, resetScroll: false })}>Limpar busca e filtros</Button>
                ) : null
              }
            />
          ) : data ? (
            <>
              {query.isError && (
                <ErrorState className="py-6" title="Falha ao atualizar" message={query.error.message} onRetry={() => void query.refetch()} retrying={query.isFetching} />
              )}
              <ul
                className={`grid grid-cols-2 gap-x-4 gap-y-7 transition-opacity max-md:pb-8 max-md:[&>li:nth-child(even)]:translate-y-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-16 ${query.isPlaceholderData ? 'opacity-60' : ''}`}
                aria-busy={query.isPlaceholderData}
                data-testid="nft-grid"
              >
                {data.items.map((nft, i) => (
                  <li key={nft.id} className="min-w-0">
                    <NftCard nft={nft} priority={i < 3} />
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} onPage={goToPage} />
            </>
          ) : null}
          <FeaturedOffer className="lg:hidden" />
        </div>
      </div>
    </section>
  )
}

function SortSelect({ value, onChange, bordered = false }: { value: SortOption; onChange: (v: SortOption) => void; bordered?: boolean }) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 items-center gap-1', bordered && 'gap-3')}>
      <label htmlFor={id} className={cn('text-[15px] whitespace-nowrap', !bordered && 'max-sm:sr-only')}>Ordenar por:</label>
      <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
        <SelectTrigger
          id={id}
          className={cn('h-9 w-auto min-w-0 gap-2 [&>span]:truncate px-1 text-[15px] whitespace-nowrap shadow-none', bordered ? 'flex-1 border-line-soft px-3' : 'border-0 bg-transparent')}
          data-testid={bordered ? 'sort-select-mobile' : 'sort-select'}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((s) => (
            <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
