import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

type Crumb = { label: string; to?: '/' | '/cart' | '/account/profile'; hash?: string }

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 text-[15px] font-bold">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={c.label}>
              <li>
                {last || !c.to ? (
                  <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                ) : (
                  <Link to={c.to} hash={c.hash} className="rounded-sm outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring">
                    {c.label}
                  </Link>
                )}
              </li>
              {!last && (
                <li aria-hidden="true" className="text-foreground">
                  /
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export const MARKET_CRUMBS: Crumb[] = [
  { label: 'Início', to: '/' },
  { label: 'Mercado', to: '/', hash: 'catalogo' },
]
