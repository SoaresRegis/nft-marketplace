import { useEffect, useId, useState } from 'react'
import { categories, chains, type CatalogFacets } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { activeFilterCount, CATEGORY_LABELS, CHAIN_LABELS, parseCsv, toCsv, type CatalogSearch } from './search'

type Props = {
  search: CatalogSearch
  facets?: CatalogFacets
  onChange: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
  className?: string
}

function toggle(list: string[], value: string, on: boolean) {
  return on ? [...new Set([...list, value])] : list.filter((v) => v !== value)
}

const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function FilterPanel({ search, facets, onChange, onClear, className }: Props) {
  const selectedCats = parseCsv(search.category, categories)
  const selectedChains = parseCsv(search.chain, chains)

  return (
    <div className={cn('flex flex-col gap-10 bg-card px-5 py-6', className)} data-testid="filter-panel">
      <OptionGroup
        legend="Coleções"
        options={categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c], count: facets?.categories[c] }))}
        selected={selectedCats}
        onToggle={(c, on) => onChange({ category: toCsv(toggle(selectedCats, c, on)) })}
        boldCount
      />

      <PriceRange
        bounds={facets?.priceRange}
        min={search.minPrice}
        max={search.maxPrice}
        onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
      />

      <OptionGroup
        legend="Rede"
        options={chains.map((c) => ({ value: c, label: CHAIN_LABELS[c], count: facets?.chains[c] }))}
        selected={selectedChains}
        onToggle={(c, on) => onChange({ chain: toCsv(toggle(selectedChains, c, on)) })}
      />

      {activeFilterCount(search) > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="self-start rounded-sm px-3 text-sm text-highlight underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}

function OptionGroup({
  legend,
  options,
  selected,
  onToggle,
  boldCount = false,
}: {
  legend: string
  options: { value: string; label: string; count?: number }[]
  selected: string[]
  onToggle: (value: string, on: boolean) => void
  boldCount?: boolean
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-bold text-foreground">{legend}</legend>
      <ul className="flex flex-col">
        {options.map((o) => {
          const checked = selected.includes(o.value)
          return (
            <li key={o.value}>
              <label
                className={cn(
                  'relative flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-[15px] leading-6 transition-colors hover:text-highlight has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring',
                  checked ? 'text-highlight' : 'text-caption',
                )}
              >
                <input type="checkbox" className="absolute inset-0 size-full cursor-pointer appearance-none rounded-sm outline-none" checked={checked} onChange={(e) => onToggle(o.value, e.target.checked)} />
                <span>{o.label}</span>
                {o.count !== undefined && (
                  <span className={cn('tabular', boldCount && 'font-bold')}>
                    <span className="sr-only">, </span>({o.count})
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function PriceRange({
  bounds,
  min,
  max,
  onApply,
}: {
  bounds?: { min: string; max: string }
  min?: string
  max?: string
  onApply: (min?: string, max?: string) => void
}) {
  const lo = bounds ? Math.floor(Number(bounds.min) * 100) / 100 : 0
  const hi = bounds ? Math.ceil(Number(bounds.max) * 100) / 100 : 0
  const fromUrl = (): [number, number] => [min ? Number(min) : lo, max ? Number(max) : hi]
  const [value, setValue] = useState<[number, number]>(fromUrl)
  const uid = useId()

  // A URL: Limpar filtros ou navegar no histórico redefine o slider.
  useEffect(() => setValue(fromUrl()), [min, max, lo, hi]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    const [a, b] = value
    const nextMin = a > lo ? a.toFixed(2) : undefined
    const nextMax = b < hi ? b.toFixed(2) : undefined
    if (nextMin !== min || nextMax !== max) onApply(nextMin, nextMax)
  }

  return (
    <fieldset aria-describedby={`${uid}-value`}>
      <legend className="mb-4 text-lg font-bold text-foreground">Faixa de preço</legend>
      <div className="flex flex-col gap-4 px-3">
        {bounds ? (
          <Slider
            min={lo}
            max={hi}
            step={0.01}
            minStepsBetweenThumbs={1}
            value={value}
            onValueChange={(v) => setValue([v[0], v[1]])}
            thumbLabels={['Preço mínimo', 'Preço máximo']}
            thumbValueText={(v) => `${decimal.format(v)} ETH`}
          />
        ) : (
          <div className="h-[18px]" aria-hidden="true" />
        )}
        <p id={`${uid}-value`} className="text-[15px] text-caption tabular" aria-live="polite">
          Preço: {bounds ? `${decimal.format(value[0])} - ${decimal.format(value[1])} ETH` : '…'}
        </p>
        <Button type="button" size="xs" className="h-9 self-start px-3 text-base" onClick={apply} disabled={!bounds}>
          Aplicar
        </Button>
      </div>
    </fieldset>
  )
}
