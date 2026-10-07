import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { networks, walletInput, walletProviders, type Network, type Wallet, type WalletInput } from '@/api/contracts'
import { EnsInput, Req, fieldLabelClass } from '@/components/common/form-bits'
import { ErrorState } from '@/components/common/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { useSession } from '@/features/auth/use-session'
import { useWallets } from '@/features/checkout/use-checkout'
import { cn } from '@/lib/utils'
import { useSaveWallet } from './use-account'

export const PROVIDER_LABELS = { metamask: 'MetaMask', coinbase: 'Coinbase Wallet', walletconnect: 'WalletConnect', rainbow: 'Rainbow' } as const
export const NETWORK_LABELS: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

export function WalletsPage() {
  const session = useSession()
  useEffect(() => {
    document.title = 'Carteiras | Kurio'
  }, [])
  if (session.status !== 'authenticated') return <Skeleton className="h-96" />
  return <Wallets userId={session.user.id} />
}

function Wallets({ userId }: { userId: string }) {
  const wallets = useWallets(userId)
  const [adding, setAdding] = useState<{ primary: boolean; secondary: boolean }>({ primary: false, secondary: false })
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const sameId = useId()

  if (wallets.isPending) return <Skeleton className="h-[560px]" />
  if (wallets.isError) return <ErrorState message={wallets.error.message} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} />

  const primary = wallets.data.items.find((w) => w.role === 'primary')
  const secondary = wallets.data.items.find((w) => w.role === 'secondary')
  const addLink = (role: 'primary' | 'secondary', open: boolean) => (
    <button
      type="button"
      onClick={() => setAdding((a) => ({ ...a, [role]: !open }))}
      aria-expanded={open}
      className="rounded-sm text-[17px] font-bold text-highlight outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {open ? 'Cancelar' : 'Adicionar'}
      <span className="sr-only"> carteira {role === 'primary' ? 'principal' : 'secundária'}</span>
    </button>
  )

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="primary-title" className="flex flex-col gap-5" data-testid="wallet-slot-primary">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="primary-title" className="text-[17px] font-bold">
              Carteira principal
            </h2>
            <p className="text-[13px] text-caption">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          {!primary && addLink('primary', adding.primary)}
        </div>
        {primary || adding.primary ? (
          <WalletForm key={primary?.id ?? 'new-primary'} userId={userId} role="primary" wallet={primary} onSaved={() => setAdding((a) => ({ ...a, primary: false }))} />
        ) : (
          <p className="text-[13px] text-caption">Você ainda não adicionou uma carteira principal.</p>
        )}
      </section>

      <section aria-labelledby="secondary-title" className="flex flex-col gap-5" data-testid="wallet-slot-secondary">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="secondary-title" className="text-[17px] font-bold">
            Carteira secundária
          </h2>
          {!secondary && (
            <div className="flex items-center gap-4">
              {primary && (
                <label htmlFor={sameId} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    id={sameId}
                    type="checkbox"
                    checked={sameAsPrimary}
                    onChange={(e) => setSameAsPrimary(e.target.checked)}
                    className="size-4 cursor-pointer appearance-none rounded-full border border-primary outline-none checked:border-[5px] focus-visible:ring-[3px] focus-visible:ring-ring"
                  />
                  Igual à carteira principal
                </label>
              )}
              {addLink('secondary', adding.secondary)}
            </div>
          )}
        </div>
        {secondary || adding.secondary ? (
          <WalletForm
            key={(secondary?.id ?? 'new-secondary') + String(sameAsPrimary)}
            userId={userId}
            role="secondary"
            wallet={secondary}
            prefill={!secondary && sameAsPrimary ? primary : undefined}
            onSaved={() => setAdding((a) => ({ ...a, secondary: false }))}
          />
        ) : (
          <p className="text-[13px] text-caption">Você ainda não adicionou uma carteira secundária.</p>
        )}
      </section>
      <p className="text-xs text-caption">A conexão com as carteiras é simulada: nenhuma extensão real é aberta.</p>
    </div>
  )
}

function toInput(role: Wallet['role'], w?: Wallet, prefill?: Wallet): WalletInput {
  const src = w ?? prefill
  return {
    label: w?.label ?? '',
    provider: w?.provider ?? 'metamask',
    address: w?.address ?? '',
    role,
    networks: w?.networks ?? (prefill ? [prefill.networks[0]] : ['ethereum']),
    displayName: src?.displayName ?? '',
    profileName: src?.profileName ?? '',
    email: src?.email ?? '',
    ensName: src?.ensName ?? '',
    referralCode: src?.referralCode ?? '',
    secondaryAddress: w?.secondaryAddress ?? '',
  }
}

function WalletForm({ userId, role, wallet, prefill, onSaved }: { userId: string; role: Wallet['role']; wallet?: Wallet; prefill?: Wallet; onSaved: () => void }) {
  const save = useSaveWallet(userId)
  const form = useForm<WalletInput>({ resolver: zodResolver(walletInput), defaultValues: toInput(role, wallet, prefill), mode: 'onTouched' })

  const onSubmit = (input: WalletInput) =>
    save.mutate(
      { id: wallet?.id, input },
      {
        onSuccess: (w) => {
          form.reset(toInput(role, w))
          onSaved()
        },
        onError: (e) => applyServerErrors(e, form.setError, ['label', 'provider', 'address', 'role', 'networks', 'displayName', 'profileName', 'email', 'ensName', 'referralCode', 'secondaryAddress']),
      },
    )

  const text = (name: 'displayName' | 'label' | 'profileName' | 'email' | 'referralCode', label: string, required = true, type = 'text') => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={fieldLabelClass}>
            {label}
            {required ? <Req /> : ' (opcional)'}
          </FormLabel>
          <FormControl>
            <Input type={type} autoComplete={name === 'email' ? 'email' : 'off'} aria-required={required || undefined} className={cn(name === 'referralCode' && 'uppercase')} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" aria-label={role === 'primary' ? 'Carteira principal' : 'Carteira secundária'}>
        {save.isError && !save.error.fields && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Não foi possível salvar</AlertTitle>
            <AlertDescription>{save.error.message}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
          {text('displayName', 'Nome de exibição')}
          {text('label', 'Apelido da carteira')}
          <FormField
            control={form.control}
            name="networks"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>
                  Rede
                  <Req />
                </FormLabel>
                <Select value={field.value?.[0]} onValueChange={(n: Network) => field.onChange([n, ...(field.value ?? []).filter((x) => x !== n)])}>
                  <FormControl>
                    <SelectTrigger aria-required>
                      <SelectValue placeholder="Selecione uma rede" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {networks.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(field.value?.length ?? 0) > 1 && <p className="text-xs text-caption">Também habilitada em {field.value.slice(1).map((n) => NETWORK_LABELS[n]).join(', ')}.</p>}
                <FormMessage />
              </FormItem>
            )}
          />
          {text('profileName', 'Nome do perfil')}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>
                  Endereço da carteira
                  <Req />
                </FormLabel>
                <FormControl>
                  <Input placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} aria-required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="secondaryAddress"
            render={({ field }) => (
              <FormItem className="md:self-end">
                <FormLabel className="sr-only">ENS ou carteira secundária (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ENS ou carteira secundária (opcional)" autoComplete="off" spellCheck={false} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>
                  Tipo de carteira
                  <Req />
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger aria-required>
                      <SelectValue placeholder="Selecione uma carteira" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {walletProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {text('referralCode', 'Código de indicação', false)}
          {text('email', 'E-mail', true, 'email')}
          <FormField
            control={form.control}
            name="ensName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabelClass}>Nome ENS (opcional)</FormLabel>
                <FormControl>
                  <EnsInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="h-10 self-start rounded-none px-2 text-[15px]" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
      </form>
    </Form>
  )
}
