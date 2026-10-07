import { HttpResponse, http } from 'msw'
import { z } from 'zod'
import { loginInput, passwordRule } from '@/api/contracts'
import { createSession, db, findUser, lookupSession, nextId, nowIso, persist, sha256, toUser } from '../db'
import { bearer, fail, parseBody, requireUser } from '../http-utils'

const registerBody = z.object({
  name: z.string().trim().min(2).optional(),
  username: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(20).regex(/^[a-z0-9_]+$/i, 'Use apenas letras, números e _'),
  email: z.string().trim().email('E-mail inválido'),
  password: passwordRule,
})

export const authHandlers = [
  http.post('*/api/auth/register', async ({ request }) => {
    const body = await parseBody(request, registerBody)
    const fields: Record<string, string> = {}
    if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) fields.email = 'Este e-mail já está cadastrado.'
    if (db.users.some((u) => u.username.toLowerCase() === body.username.toLowerCase())) fields.username = 'Este nome de usuário já está em uso.'
    if (Object.keys(fields).length) {
      return fail(409, 'EMAIL_TAKEN', 'Já existe uma conta com esses dados.', { fields })
    }
    const salt = nextId('salt')
    const user = {
      id: nextId('usr'),
      name: body.name ?? body.username,
      username: body.username.toLowerCase(),
      email: body.email.toLowerCase(),
      bio: '',
      ensName: '',
      walletNickname: '',
      avatarUrl: null,
      createdAt: nowIso(),
      salt,
      passwordHash: await sha256(`${salt}:${body.password}`),
    }
    db.users.push(user)
    db.favorites[user.id] = []
    db.wallets[user.id] = []
    persist()
    const s = createSession(user.id)
    return HttpResponse.json({ token: s.token, user: toUser(user), expiresAt: new Date(s.expiresAt).toISOString() }, { status: 201 })
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    const body = await parseBody(request, loginInput)
    const user = db.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())
    const hash = user ? await sha256(`${user.salt}:${body.password}`) : null
    if (!user || hash !== user.passwordHash) {
      return fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', { fields: { password: 'E-mail ou senha incorretos.' } })
    }
    const s = createSession(user.id)
    return HttpResponse.json({ token: s.token, user: toUser(user), expiresAt: new Date(s.expiresAt).toISOString() })
  }),

  http.get('*/api/auth/session', ({ request }) => {
    const userId = requireUser(request)
    const s = lookupSession(bearer(request))
    const user = findUser(userId)
    if (!user || s.status !== 'ok') return fail(401, 'UNAUTHENTICATED', 'Sessão inválida.')
    return HttpResponse.json({ user: toUser(user), expiresAt: new Date(s.expiresAt).toISOString() })
  }),

  http.post('*/api/auth/logout', ({ request }) => {
    const token = bearer(request)
    db.sessions = db.sessions.filter((s) => s.token !== token)
    persist()
    return HttpResponse.json({ ok: true })
  }),
]

