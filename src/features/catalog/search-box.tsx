import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function SearchBox({
  value,
  onSearch,
  autoFocus = false,
  placeholder = 'Busque seus NFTs favoritos',
  variant = 'default',
  className,
}: {
  value: string
  onSearch: (q: string, opts: { submit: boolean }) => void
  autoFocus?: boolean
  placeholder?: string
  variant?: 'default' | 'pill'
  className?: string
}) {
  const [text, setText] = useState(value)
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(onSearch)
  latest.current = onSearch

  useEffect(() => setText(value), [value])
  useEffect(() => () => clearTimeout(timer.current), [])

  const schedule = (next: string) => {
    setText(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (next.trim() !== value) latest.current(next.trim(), { submit: false })
    }, 350)
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        clearTimeout(timer.current)
        latest.current(text.trim(), { submit: true })
      }}
      className={cn('relative', className)}
    >
      <label htmlFor={id} className="sr-only">Buscar NFTs por nome, criador ou tag</label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => schedule(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        className={cn(
          'w-full text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden',
          variant === 'pill'
            ? 'h-[45px] rounded-[10px] border border-transparent bg-card pr-12 pl-12 text-[15px] tracking-[0.04em] placeholder:text-caption'
            : 'h-12 rounded-md border border-line bg-background pr-24 pl-4 text-base placeholder:text-muted-foreground/70 focus-visible:border-highlight',
        )}
      />
      {variant === 'pill' && <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-caption" aria-hidden="true" />}
      <div className="absolute inset-y-0 right-3 flex items-center gap-1">
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('')
              clearTimeout(timer.current)
              latest.current('', { submit: false })
            }}
            className="rounded-full p-2 text-caption hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring outline-none"
            aria-label="Limpar busca"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
        <button type="submit" className={cn(variant === 'pill' && 'sr-only focus:not-sr-only', 'rounded-full p-2 text-foreground hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring outline-none')} aria-label="Buscar">
          <Search className="size-5" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}

