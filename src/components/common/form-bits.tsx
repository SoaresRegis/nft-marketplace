import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export function Req() {
  return (
    <>
      <span className="ml-0.5 text-lg leading-none text-[#e8724a]" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (obrigatório)</span>
    </>
  )
}

export function EnsInput({ id, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex gap-2.5">
      <Select value=".eth" disabled={props.disabled}>
        <SelectTrigger className="w-[88px] shrink-0 px-2.5" aria-label="Domínio ENS">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=".eth">.eth</SelectItem>
        </SelectContent>
      </Select>
      <Input id={id} autoComplete="off" spellCheck={false} {...props} />
    </div>
  )
}

export const fieldLabelClass = 'block text-[15px] leading-6 font-normal text-foreground'
