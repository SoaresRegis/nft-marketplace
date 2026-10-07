import { Minus, Plus } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled,
  size = 'md',
  variant = 'boxed',
  describedBy,
}: {
  value: number
  min?: number
  max: number
  onChange: (n: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'boxed' | 'pill' | 'circle'
  describedBy?: string
}) {
  const id = useId()
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return setText(String(value))
    const clamped = Math.max(min, Math.min(max, n))
    setText(String(clamped))
    if (clamped !== value) onChange(clamped)
  }
  const h = size === 'sm' ? 'h-10' : 'h-12'
  const pill = variant !== 'boxed'
  const btn = variant === 'circle'
    ? 'grid size-[26px] place-items-center rounded-full border border-line-soft bg-surface-2 text-foreground outline-none transition-colors hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring disabled:text-line disabled:opacity-60'
    : pill
    ? cn(
        'grid place-items-center bg-primary text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40',
        size === 'sm' ? 'h-[26px] w-[18px] rounded-md' : 'size-[30px] rounded-full',
      )
    : cn('grid aspect-square place-items-center outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40', h)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className={cn('inline-flex items-center', pill ? 'gap-1' : cn('rounded-lg border-2 border-border', h), disabled && 'opacity-50')}>
        <button
          type="button"
          className={cn(btn, !pill && 'rounded-l-md')}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          aria-label={`Diminuir ${label.toLowerCase()}`}
        >
          <Minus className={pill && size === 'sm' ? 'size-3' : 'size-4'} strokeWidth={pill ? 3 : 2} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit((e.target as HTMLInputElement).value)
            }
          }}
          aria-describedby={describedBy}
          className={cn('rounded-sm bg-transparent text-center text-base tabular outline-none focus-visible:ring-[3px] focus-visible:ring-ring', pill ? 'w-8' : 'w-12')}
          data-testid="quantity-input"
        />
        <button
          type="button"
          className={cn(btn, !pill && 'rounded-r-md')}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          <Plus className={pill && size === 'sm' ? 'size-3' : 'size-4'} strokeWidth={pill ? 3 : 2} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
