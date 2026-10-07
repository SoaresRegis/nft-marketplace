import { HttpResponse, delay, http } from 'msw'
import { z } from 'zod'
import { avatarInput, passwordRule, profileInput, walletConnectInput, walletInput, type Wallet } from '@/api/contracts'
import { db, findUser, nextId, nowIso, persist, scenario, sha256, toUser } from '../db'
import { fail, parseBody, requireUser } from '../http-utils'

const passwordBody = z.object({ currentPassword: z.string().min(1), newPassword: passwordRule })
const BLOCKED_ADDRESS = '0x000000000000000000000000000000000000dead'

function me(request: Request) {
  const userId = requireUser(request)
  const user = findUser(userId)
  if (!user) throw fail(401, 'UNAUTHENTICATED', 'Sessão inválida.')
  return user
}

export const accountHandlers = [
  http.get('*/api/me/profile', ({ request }) => HttpResponse.json(toUser(me(request)))),

  http.patch('*/api/me/profile', async ({ request }) => {
    const user = me(request)
    const body = await parseBody(request, profileInput)
    const fields: Record<string, string> = {}
    if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === body.email.toLowerCase())) fields.email = 'Este e-mail já está em uso.'
    if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === body.username.toLowerCase())) fields.username = 'Este nome de usuário já está em uso.'
    if (Object.keys(fields).length) return fail(409, 'CONFLICT', 'Alguns dados já estão em uso.', { fields })
    Object.assign(user, { name: body.name, username: body.username.toLowerCase(), email: body.email.toLowerCase(), ensName: body.ensName, walletNickname: body.walletNickname })
    persist()
    return HttpResponse.json(toUser(user))
  }),

  http.put('*/api/me/avatar', async ({ request }) => {
    const user = me(request)
    const { dataUrl } = await parseBody(request, avatarInput)
    // ~1,5MB de base64 ≈ 1,1MB de imagem
    if (dataUrl.length > 1_500_000) {
      return fail(422, 'VALIDATION_ERROR', 'A imagem deve ter no máximo 1MB.', { fields: { dataUrl: 'A imagem deve ter no máximo 1MB.' } })
    }
    user.avatarUrl = dataUrl
    persist()
    return HttpResponse.json(toUser(user))
  }),

  http.delete('*/api/me/avatar', ({ request }) => {
    const user = me(request)
    user.avatarUrl = null
    persist()
    return HttpResponse.json(toUser(user))
  }),

  http.post('*/api/me/password', async ({ request }) => {
    const user = me(request)
    const body = await parseBody(request, passwordBody)
    if ((await sha256(`${user.salt}:${body.currentPassword}`)) !== user.passwordHash) {
      return fail(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { fields: { currentPassword: 'Senha atual incorreta.' } })
    }
    user.salt = nextId('salt')
    user.passwordHash = await sha256(`${user.salt}:${body.newPassword}`)
    persist()
    return HttpResponse.json({ ok: true })
  }),

  http.get('*/api/me/wallets', ({ request }) => {
    const user = me(request)
    return HttpResponse.json({ items: db.wallets[user.id] ?? [] })
  }),

  http.post('*/api/me/wallets', async ({ request }) => {
    const user = me(request)
    const body = await parseBody(request, walletInput)
    const list = (db.wallets[user.id] ??= [])
    const err = validateWallet(list, body, null)
    if (err) return err
    const wallet: Wallet = { id: nextId('wal'), ...body, updatedAt: nowIso() }
    list.push(wallet)
    persist()
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.put('*/api/me/wallets/:id', async ({ request, params }) => {
    const user = me(request)
    const body = await parseBody(request, walletInput)
    const list = (db.wallets[user.id] ??= [])
    const wallet = list.find((w) => w.id === params.id)
    if (!wallet) return fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const err = validateWallet(list, body, wallet.id)
    if (err) return err
    Object.assign(wallet, body, { updatedAt: nowIso() })
    const conn = db.walletConnections[user.id]
    if (conn?.walletId === wallet.id && !wallet.networks.includes(conn.network)) db.walletConnections[user.id] = null
    persist()
    return HttpResponse.json(wallet)
  }),

  http.post('*/api/me/wallets/:id/connect', async ({ request, params }) => {
    const user = me(request)
    const { network } = await parseBody(request, walletConnectInput)
    const wallet = (db.wallets[user.id] ?? []).find((w) => w.id === params.id)
    if (!wallet) return fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (!wallet.networks.includes(network)) {
      return fail(422, 'VALIDATION_ERROR', `Esta carteira não está habilitada na rede ${network}.`, { fields: { network: 'Rede não suportada pela carteira.' } })
    }
    await delay(600) // aprovação na "extensão"
    if (scenario.walletConnect === 'reject') {
      return fail(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    }
    const conn = { walletId: wallet.id, network, status: 'connected' as const, connectedAt: nowIso() }
    db.walletConnections[user.id] = conn
    persist()
    return HttpResponse.json(conn)
  }),

  http.post('*/api/me/wallets/:id/disconnect', ({ request, params }) => {
    const user = me(request)
    const conn = db.walletConnections[user.id]
    const network = conn?.network ?? 'ethereum'
    if (conn?.walletId === params.id) db.walletConnections[user.id] = null
    persist()
    return HttpResponse.json({ walletId: String(params.id), network, status: 'disconnected', connectedAt: null })
  }),
]

function validateWallet(list: Wallet[], body: z.infer<typeof walletInput>, selfId: string | null) {
  const fields: Record<string, string> = {}
  if (body.address.toLowerCase() === BLOCKED_ADDRESS) fields.address = 'Endereço bloqueado (burn address).'
  if (list.some((w) => w.id !== selfId && w.address.toLowerCase() === body.address.toLowerCase())) fields.address = 'Esta carteira já está cadastrada.'
  if (list.some((w) => w.id !== selfId && w.role === body.role)) {
    fields.role = body.role === 'primary' ? 'Você já tem uma carteira principal.' : 'Você já tem uma carteira secundária.'
  }
  if (Object.keys(fields).length) {
    return fail(fields.role || fields.address?.includes('cadastrada') ? 409 : 422, fields.role ? 'CONFLICT' : 'VALIDATION_ERROR', 'Não foi possível salvar a carteira.', { fields })
  }
  return null
}
