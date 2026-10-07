import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, ImageIcon, Loader2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { passwordChangeInput, profileInput, type PasswordChangeInput, type ProfileInput, type User } from '@/api/contracts'
import { EnsInput, Req, fieldLabelClass } from '@/components/common/form-bits'
import { PasswordInput } from '@/components/common/password-input'
import { ErrorState } from '@/components/common/states'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { useSession } from '@/features/auth/use-session'
import { useChangePassword, useProfile, useUpdateAvatar, useUpdateProfile } from './use-account'

export function ProfilePage() {
  const session = useSession()
  useEffect(() => {
    document.title = 'Perfil | Kurio'
  }, [])
  if (session.status !== 'authenticated') return <Skeleton className="h-96" />
  return <Profile userId={session.user.id} />
}

function Profile({ userId }: { userId: string }) {
  const profile = useProfile(userId)
  if (profile.isPending) return <Skeleton className="h-[640px]" />
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
  return <ProfileForm userId={userId} user={profile.data} />
}

const toValues = (u: User): ProfileInput => ({ name: u.name, username: u.username, email: u.email, ensName: u.ensName, walletNickname: u.walletNickname })

function ProfileForm({ userId, user }: { userId: string; user: User }) {
  const update = useUpdateProfile(userId)
  const change = useChangePassword()
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileInput), defaultValues: toValues(user), mode: 'onTouched' })
  const pw = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeInput),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  })
  const [saved, setSaved] = useState(false)
  
  const { isDirty } = form.formState

  const save = async () => {
    setSaved(false)
    const wantsPassword = Object.values(pw.getValues()).some((v) => v !== '')
    const profileOk = await form.trigger(undefined, { shouldFocus: true })
    const passwordOk = wantsPassword ? await pw.trigger(undefined, { shouldFocus: profileOk }) : true
    if (!profileOk || !passwordOk) return
    const jobs: Promise<unknown>[] = []
    if (isDirty) {
      jobs.push(
        update.mutateAsync(form.getValues()).then(
          (u) => form.reset(toValues(u)),
          (e) => {
            applyServerErrors(e, form.setError, ['name', 'username', 'email', 'ensName', 'walletNickname'])
            throw e
          },
        ),
      )
    }
    if (wantsPassword) {
      jobs.push(
        change.mutateAsync(pw.getValues()).then(
          () => pw.reset(),
          (e) => {
            applyServerErrors(e, pw.setError, ['currentPassword', 'newPassword'])
            throw e
          },
        ),
      )
    }
    if (!jobs.length) {
      setSaved(true)
      return
    }
    const results = await Promise.allSettled(jobs)
    if (results.every((r) => r.status === 'fulfilled')) setSaved(true)
  }
  const pending = update.isPending || change.isPending
  const requiredLabel = (text: string) => (
    <>
      {text}
      <Req />
    </>
  )

  return (
    <section aria-labelledby="profile-title" className="flex flex-col gap-7">
      <h2 id="profile-title" className="text-[15px] font-bold">
        Perfil do colecionador
      </h2>
      {update.isError && !update.error.fields && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Não foi possível salvar o perfil</AlertTitle>
          <AlertDescription>{update.error.message}</AlertDescription>
        </Alert>
      )}
      <form
        noValidate
        aria-label="Perfil do colecionador"
        className="flex flex-col gap-7"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Form {...form}>
          <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>{requiredLabel('Nome de exibição')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" aria-required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>{requiredLabel('Nome de usuário')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="username" aria-required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>{requiredLabel('E-mail')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" aria-required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ensName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>Nome ENS (opcional)</FormLabel>
                  <FormControl>
                    <EnsInput placeholder="seunome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="walletNickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={fieldLabelClass}>{requiredLabel('Apelido da carteira')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" aria-required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AvatarField userId={userId} user={user} />
          </div>
        </Form>

        <Form {...pw}>
          <fieldset className="flex flex-col gap-5 md:max-w-[calc(50%-14px)]">
            <legend className="mb-5 text-[15px] font-bold">Alterar senha</legend>
            {change.isError && !change.error.fields && (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Não foi possível alterar a senha</AlertTitle>
                <AlertDescription>{change.error.message}</AlertDescription>
              </Alert>
            )}
            {(
              [
                ['currentPassword', 'Senha atual', 'current-password'],
                ['newPassword', 'Nova senha', 'new-password'],
                ['confirmPassword', 'Confirmar nova senha', 'new-password'],
              ] as const
            ).map(([name, label, autoComplete]) => (
              <FormField
                key={name}
                control={pw.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={fieldLabelClass}>{label}</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete={autoComplete} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <p className="text-xs text-caption">Deixe em branco para manter a senha. A nova senha precisa de 8 caracteres, com letras e números.</p>
          </fieldset>
        </Form>

        <div className="flex items-center gap-4">
          <Button type="submit" className="h-10 rounded-none px-10 text-[15px]" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
          {saved && (
            <p role="status" className="text-sm text-success">
              Alterações salvas.
            </p>
          )}
        </div>
      </form>
    </section>
  )
}

const MAX_AVATAR_BYTES = 1024 * 1024

function AvatarField({ userId, user }: { userId: string; user: User }) {
  const update = useUpdateAvatar(userId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const onFile = (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Use uma imagem PNG, JPG ou WEBP.')
    if (file.size > MAX_AVATAR_BYTES) return setError('A imagem deve ter no máximo 1MB.')
    const reader = new FileReader()
    reader.onload = () => update.mutate(String(reader.result))
    reader.onerror = () => setError('Não foi possível ler o arquivo.')
    reader.readAsDataURL(file)
  }
  const message = error ?? (update.isError ? update.error.message : null)
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
      <span id={`${id}-label`} className={fieldLabelClass}>
        Avatar
      </span>
      <div className="flex flex-wrap items-center gap-6">
        <span className="grid size-[50px] place-items-center overflow-hidden rounded-full border border-line/60 bg-card text-highlight">
          {user.avatarUrl ? <img src={user.avatarUrl} alt={`Avatar de ${user.name}`} className="size-full object-cover" /> : <ImageIcon className="size-6" strokeWidth={1.5} aria-label="Sem avatar" />}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
          aria-label="Arquivo do avatar"
          data-testid="avatar-input"
        />
        <Button type="button" size="xs" className="h-10 rounded-none px-6 text-[15px]" onClick={() => inputRef.current?.click()} disabled={update.isPending} aria-describedby={`${id}-hint`}>
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Alterar
          <span className="sr-only"> avatar</span>
        </Button>
        {user.avatarUrl && (
          <button type="button" className="rounded-sm text-[15px] outline-none hover:text-highlight focus-visible:ring-[3px] focus-visible:ring-ring" onClick={() => update.mutate(null)} disabled={update.isPending}>
            Remover<span className="sr-only"> avatar</span>
          </button>
        )}
      </div>
      <p id={`${id}-hint`} className="text-xs text-caption">
        PNG, JPG ou WEBP de até 1MB.
      </p>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
