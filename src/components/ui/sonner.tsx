import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      mobileOffset={{ bottom: 'calc(var(--bottom-bar, 0px) + 16px)' }}
      toastOptions={{
        classNames: {
          toast: '!bg-card !text-foreground !border-border !rounded-lg !font-sans',
          description: '!text-caption',
          actionButton: '!bg-primary !text-white',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
