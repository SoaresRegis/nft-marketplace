import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border px-4 py-3.5 text-sm [&>svg]:size-5 [&>svg]:translate-y-0.5', {
  variants: {
    variant: {
      default: 'border-border bg-card text-foreground',
      info: 'border-primary/50 bg-primary/10 text-foreground [&>svg]:text-primary',
      warning: 'border-warning/50 bg-warning/10 text-foreground [&>svg]:text-warning',
      destructive: 'border-destructive/50 bg-destructive/10 text-foreground [&>svg]:text-destructive',
      success: 'border-success/50 bg-success/10 text-foreground [&>svg]:text-success',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('col-start-2 font-semibold text-base', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('col-start-2 text-caption [&_p]:leading-relaxed', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
