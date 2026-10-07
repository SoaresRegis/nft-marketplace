import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Ocultar caracteres digitados' : 'Exibir caracteres digitados'}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-caption outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {visible ? <Eye className="size-[18px]" aria-hidden="true" /> : <EyeOff className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  )
}
