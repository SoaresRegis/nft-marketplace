import { zodResolver } from '@hookform/resolvers/zod'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { registerInput, type RegisterInput } from '@/api/contracts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/common/password-input'
import { AuthShell, authInputClass, authSubmitClass } from './auth-shell'
import { applyServerErrors } from './apply-server-errors'
import { safeRedirect, useRegister } from './use-auth-mutations'

const route = getRouteApi('/register')

export function RegisterPage() {
  const { redirect } = route.useSearch()
  const navigate = useNavigate()
  const register = useRegister()
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerInput),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  })

  useEffect(() => {
    document.title = 'Criar conta | Kurio'
  }, [])

  const onSubmit = (values: RegisterInput) =>
    register.mutate(values, {
      onSuccess: () => void navigate({ to: safeRedirect(redirect), replace: true }),
      onError: (error) => applyServerErrors(error, form.setError, ['username', 'email', 'password']),
    })

  const fields: { name: keyof RegisterInput; label: string; placeholder: string; type?: 'password' | 'email'; autoComplete: string; hint?: string }[] = [
    { name: 'username', label: 'Nome de usuário', placeholder: 'Nome de usuário', autoComplete: 'username', hint: 'Letras, números e _ (3 a 20 caracteres).' },
    { name: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', type: 'email', autoComplete: 'email' },
    { name: 'password', label: 'Senha', placeholder: 'Senha', type: 'password', autoComplete: 'new-password', hint: 'Mínimo de 8 caracteres, com letras e números.' },
    { name: 'confirmPassword', label: 'Confirmar senha', placeholder: 'Confirmar senha', type: 'password', autoComplete: 'new-password' },
  ]

  return (
    <AuthShell mode="register" title="Criar conta" mobileTitle="Criar perfil de colecionador" subtitle="Crie seu perfil de colecionador e conecte uma carteira quando quiser." redirect={redirect}>
      {register.isError && !register.error.fields && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Não foi possível criar a conta</AlertTitle>
          <AlertDescription>{register.error.message}</AlertDescription>
        </Alert>
      )}
      {register.isError && register.error.code === 'EMAIL_TAKEN' && (
        <Alert variant="warning" role="alert" data-testid="register-conflict">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Conta já existente</AlertTitle>
          <AlertDescription>
            {register.error.message}{' '}
            <Link to="/login" search={{ redirect }} replace className="font-semibold text-highlight underline">
              Entrar com esta conta
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3" aria-label="Formulário de cadastro">
          {fields.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">{f.label}</FormLabel>
                  <FormControl>
                    {f.type === 'password' ? (
                      <PasswordInput autoComplete={f.autoComplete} placeholder={f.placeholder} className={authInputClass} {...field} />
                    ) : (
                      <Input type={f.type ?? 'text'} autoComplete={f.autoComplete} placeholder={f.placeholder} className={authInputClass} {...field} />
                    )}
                  </FormControl>
                  {f.hint && <FormDescription className="sr-only">{f.hint}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button type="submit" className={authSubmitClass} disabled={register.isPending}>
            {register.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {register.isPending ? (
              'Criando conta…'
            ) : (
              <>
                <span className="max-md:hidden">Criar conta</span>
                <span className="md:hidden">Criar perfil</span>
              </>
            )}
          </Button>
        </form>
      </Form>
    </AuthShell>
  )
}
