import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Slider do shadcn/ui (Radix), com um rótulo acessível por alça. */
function Slider({
  className,
  thumbLabels = [],
  thumbValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[]; thumbValueText?: (value: number) => string }) {
  const values = props.value ?? props.defaultValue ?? [props.min ?? 0]
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-primary/35">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((v, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabels[i]}
          aria-valuetext={thumbValueText?.(v)}
          className="block size-[18px] rounded-full border-2 border-background bg-primary shadow outline-none transition-[box-shadow] hover:ring-4 hover:ring-primary/30 focus-visible:ring-[3px] focus-visible:ring-ring"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
