import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/features/cart/use-cart'

type State = { scenario: { preset: string }; presets: { name: string; label: string }[]; connections: { id: number; userId: string | null }[] }

async function control(path: string, init?: RequestInit) {
  const res = await fetch(`/__mock${path}`, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? `HTTP ${res.status}`)
  return res.json()
}

export default function MockPanel() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State | null>(null)
  const queryClient = useQueryClient()
  const cart = useCart()
  const firstItem = cart.data?.items[0]

  const refresh = () => control('/state').then(setState).catch(() => undefined)
  useEffect(() => {
    if (open) void refresh()
  }, [open])

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      toast.info(`Simulação: ${label}`)
      void refresh()
    } catch (e) {
      toast.error(`Simulação falhou: ${(e as Error).message}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-above-bar left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-lg outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"
          data-testid="mock-panel-trigger"
        >
          <FlaskConical className="size-4 text-primary" aria-hidden="true" /> <span className="max-sm:sr-only">Cenários</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" aria-describedby="mock-desc">
        <SheetHeader>
          <SheetTitle>Cenários de simulação</SheetTitle>
          <SheetDescription id="mock-desc">Controla a API simulada (MSW) e o servidor Socket.IO simulado.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-5 pb-8">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mock-preset">Cenário de rede/negócio</Label>
            <Select
              value={state?.scenario.preset}
              onValueChange={(preset) =>
                run(`cenário ${preset}`, async () => {
                  await control('/scenario', { method: 'PUT', body: JSON.stringify({ preset }) })
                  await queryClient.invalidateQueries()
                })
              }
            >
              <SelectTrigger id="mock-preset"><SelectValue placeholder="Carregando…" /></SelectTrigger>
              <SelectContent>
                {state?.presets.map((p) => <SelectItem key={p.name} value={p.name}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Tempo real</p>
            <p className="text-sm text-caption">Conexões ativas: {state?.connections.length ?? '–'}</p>
            <Button variant="secondary" size="xs" disabled={!firstItem} onClick={() => firstItem && run('preço alterado', () => control(`/nfts/${firstItem.nftId}`, { method: 'POST', body: JSON.stringify({ editionId: firstItem.editionId, priceEth: (Number(firstItem.unitPriceEth) * 1.15).toFixed(4) }) }))}>
              Alterar preço do 1º item do carrinho
            </Button>
            <Button variant="secondary" size="xs" disabled={!firstItem} onClick={() => firstItem && run('edição esgotada', () => control(`/nfts/${firstItem.nftId}`, { method: 'POST', body: JSON.stringify({ editionId: firstItem.editionId, available: 0 }) }))}>
              Esgotar 1º item do carrinho
            </Button>
            <Button variant="secondary" size="xs" onClick={() => run('evento duplicado', () => control('/events/replay', { method: 'POST', body: '{}' }))}>
              Reenviar último evento (duplicata)
            </Button>
            <Button variant="secondary" size="xs" onClick={() => run('queda do socket', () => control('/socket/drop', { method: 'POST' }))}>
              Derrubar conexão do socket
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Sessão e dados</p>
            <Button variant="secondary" size="xs" onClick={() => run('sessão expirada', () => control('/session/expire', { method: 'POST' }))}>
              Expirar sessão agora
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                run('dados restaurados', async () => {
                  await control('/reset', { method: 'POST', body: JSON.stringify({ preset: 'default' }) })
                  window.location.assign('/')
                })
              }
            >
              Restaurar cenário inicial
            </Button>
            <p className="text-xs text-muted-foreground">Usuários: ana@nft.dev e bruno@nft.dev — senha Senha@123</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
