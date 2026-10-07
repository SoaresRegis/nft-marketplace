import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-none border border-line/60 bg-input px-3 py-2 text-[15px] text-input-foreground placeholder:text-caption/80 outline-none focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/70',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
