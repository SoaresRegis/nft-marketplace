import { zodResolver } from '@hookform/resolvers/zod'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { loginInput, type LoginInput } from '@/api/contracts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/common/password-input'
import { AuthShell, authInputClass, authSubmitClass } from './auth-shell'
import { applyServerErrors } from './apply-server-errors'
import { safeRedirect, useLogin } from './use-auth-mutations'

const route = getRouteApi('/login')

export function LoginPage() {
  const { redirect, reason } = route.useSearch()
  const navigate = useNavigate()
  const login = useLogin()
  const [forgot, setForgot] = useState(false)
  const form = useForm<LoginInput>({ resolver: zodResolver(loginInput), defaultValues: { email: '', password: '' }, mode: 'onTouched' })

  useEffect(() => {
    document.title = 'Entrar | Kurio'
  }, [])

  const onSubmit = (values: LoginInput) =>
    login.mutate(values, {
      onSuccess: () => void navigate({ to: safeRedirect(redirect), replace: true }),
      onError: (error) => {
        applyServerErrors(error, form.setError, ['email', 'password'])
      },
    })

  return (
    <AuthShell mode="login" title="Entrar" subtitle="Entre para gerenciar sua carteira, coleção e perfil de criador." redirect={redirect}>
      {reason === 'expired' && (
        <Alert variant="warning" data-testid="session-expired-alert">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Sua sessão expirou</AlertTitle>
          <AlertDescription>Entre novamente para continuar de onde parou. Seu carrinho e o progresso do checkout foram mantidos.</AlertDescription>
        </Alert>
      )}
      {login.isError && !login.error.fields && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Não foi possível entrar</AlertTitle>
          <AlertDescription>{login.error.message}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3" aria-label="Formulário de login">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">E-mail</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="contato@email.com" className={authInputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Senha</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" placeholder="Senha" className={authInputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="self-end rounded-sm text-[13px] text-highlight outline-none max-md:text-[14px] max-md:tracking-[0.04em] hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
            aria-expanded={forgot}
          >
            Esqueceu a senha?
          </button>
          {forgot && (
            <p role="status" className="text-xs text-caption">
              A recuperação por e-mail não existe nesta demonstração. As contas de teste usam a senha Senha@123.
            </p>
          )}
          <Button type="submit" className={authSubmitClass} disabled={login.isPending}>
            {login.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Form>
      <p className="text-center text-xs text-caption max-md:mt-2">Demonstração: ana@nft.dev ou bruno@nft.dev, senha Senha@123.</p>
    </AuthShell>
  )
}
