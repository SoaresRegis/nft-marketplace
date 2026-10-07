import { useEffect, useRef, useState } from 'react'
import type { NftSummary } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { NftCard } from './nft-card'

export function NftCarousel({ title, items, loading, id }: { title: string; items: NftSummary[]; loading?: boolean; id: string }) {
  const ref = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      setPages(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)))
      setPage(Math.round(el.scrollLeft / el.clientWidth))
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [items.length])

  const goTo = (p: number) => {
    const el = ref.current
    if (el) el.scrollTo({ left: p * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  if (!loading && items.length === 0) return null
  return (
    <section aria-labelledby={id} className="flex flex-col gap-8">
      <h2 id={id} className="border-b border-border pb-2 text-lg font-bold text-highlight">
        {title}
      </h2>
      <ul
        ref={ref}
        className="-mx-1 grid snap-x snap-mandatory auto-cols-[calc((100%-1rem)/2)] grid-flow-col gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] md:auto-cols-[calc((100%-3*1.5rem)/4)] md:gap-6 lg:auto-cols-[calc((100%-4*1.5rem)/5)]"
        data-testid={`${id}-list`}
      >
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <Skeleton className="aspect-[258/300] rounded-none" />
              </li>
            ))
          : items.map((n) => (
              <li key={n.id} className="snap-start">
                <NftCard nft={n} />
              </li>
            ))}
      </ul>
      {pages > 1 && (
        <div role="group" aria-label={`Páginas de ${title}`} className="flex justify-center gap-1">
          {Array.from({ length: pages }, (_, p) => (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-label={`Página ${p + 1} de ${pages}`}
              aria-current={p === page ? 'true' : undefined}
              className={cn(
                'grid size-6 place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                'before:block before:size-3 before:rounded-full before:border before:border-primary',
                p === page && 'before:bg-primary',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
