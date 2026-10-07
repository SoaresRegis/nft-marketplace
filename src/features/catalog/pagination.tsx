import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function pagesToShow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, page - 1, page, page + 1])
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

const btn =
  'inline-grid h-[34px] min-w-[34px] place-items-center rounded-sm border px-2 text-base outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'
const idle = 'border-foreground/25 text-foreground hover:border-highlight hover:text-highlight'

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação" className="flex justify-end pt-6">
      <ul className="flex flex-wrap items-center gap-2">
        {page > 1 && (
          <li>
            <button type="button" className={cn(btn, idle)} onClick={() => onPage(page - 1)} aria-label="Página anterior">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          </li>
        )}
        {pagesToShow(page, totalPages).map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted-foreground">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={cn(btn, p === page ? 'border-primary bg-primary font-bold text-primary-foreground' : idle)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <button type="button" className={cn(btn, idle)} onClick={() => onPage(page + 1)} aria-label="Próxima página">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
