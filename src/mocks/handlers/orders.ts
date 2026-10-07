import { HttpResponse, delay, http } from 'msw'
import { createOrderInput, quoteInput, type Order } from '@/api/contracts'
import * as money from '@/lib/money'
import { computeQuote, db, getGuestCart, getUserCart, nextId, nowIso, persist, scenario, sha256 } from '../db'
import { bearer, fail, parseBody, requireUser } from '../http-utils'
import { paymentPlan, scheduleSettlement, settleDue, updateEdition } from '../mutations'

export const CLIENT_ORDER_TIMEOUT_MS = 6000

export const orderHandlers = [
  http.post('*/api/quotes', async ({ request }) => {
    const userId = bearer(request) ? requireUser(request) : null
    const cart = userId ? getUserCart(userId) : getGuestCart(request.headers.get('X-Guest-Cart'))
    const { network } = await parseBody(request, quoteInput)
    const rec = computeQuote(cart, userId ?? `guest:${cart.id}`, network)
    db.quotes[rec.quote.id] = rec
    persist()

    const first = rec.quote.lines[0]
    if (userId && scenario.checkoutMutation !== 'none' && first && !db.consumed.checkoutMutation) {
      db.consumed.checkoutMutation = 1
      const mutation = scenario.checkoutMutation
      setTimeout(() => {
        const nft = db.nfts.find((n) => n.id === first.nftId)
        const ed = nft?.editions.find((e) => e.id === first.editionId)
        if (!ed) return
        if (mutation === 'price-change') {
          updateEdition(first.nftId, first.editionId, { priceEth: money.normalize(money.toBig(ed.priceEth).times('1.1').round(6)) })
        } else {
          updateEdition(first.nftId, first.editionId, { available: 0 })
        }
      }, 1500)
    }
    return HttpResponse.json(rec.quote)
  }),

  http.post('*/api/orders', async ({ request }) => {
    const userId = requireUser(request)
    const key = request.headers.get('Idempotency-Key')
    if (!key || key.length < 8) return fail(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
    const body = await parseBody(request, createOrderInput)
    const bodyHash = await sha256(JSON.stringify(body))
    const scoped = `${userId}:${key}`

    const prior = db.idempotency[scoped]
    if (prior) {
      if (prior.bodyHash !== bodyHash) {
        return fail(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.')
      }
      await settleDue()
      return HttpResponse.json(db.orders[prior.orderId].order, { status: 200, headers: { 'Idempotent-Replayed': 'true' } })
    }

    const stored = db.quotes[body.quoteId]
    if (!stored || stored.userId !== userId) {
      return fail(409, 'QUOTE_STALE', 'Cotação inválida. Revise o pedido.', { details: { quote: null } })
    }
    const cart = getUserCart(userId)
    const fresh = computeQuote(cart, userId, body.network)
    const expired = Date.parse(stored.quote.expiresAt) <= Date.now()
    if (expired || fresh.fingerprint !== stored.fingerprint || !fresh.quote.valid) {
      db.quotes[fresh.quote.id] = fresh
      persist()
      return fail(409, 'QUOTE_STALE', 'Preço, disponibilidade, cupom ou taxas mudaram. Revise e confirme novamente.', {
        details: { quote: fresh.quote },
      })
    }

    const wallet = (db.wallets[userId] ?? []).find((w) => w.id === body.walletId)
    if (!wallet) return fail(404, 'NOT_FOUND', 'Carteira não encontrada.', { fields: { walletId: 'Selecione uma carteira cadastrada.' } })
    const conn = db.walletConnections[userId]
    if (!conn || conn.status !== 'connected' || conn.walletId !== wallet.id || conn.network !== body.network) {
      return fail(409, 'CONFLICT', 'Conecte a carteira na rede selecionada antes de confirmar.', {
        fields: { walletId: 'Carteira desconectada.' },
      })
    }

    const q = stored.quote
    const ts = nowIso()
    const order: Order = {
      id: nextId('ord'),
      userId,
      status: 'pending',
      lines: q.lines.map((l) => ({ ...l })),
      coupon: q.coupon,
      subtotalEth: q.subtotalEth,
      discountEth: q.discountEth,
      networkFeeEth: q.networkFeeEth,
      totalEth: q.totalEth,
      network: body.network,
      wallet: { id: wallet.id, label: wallet.label, address: wallet.address, provider: wallet.provider },
      collector: { fullName: body.collector.fullName, username: body.collector.username, profileName: body.collector.profileName, email: body.collector.email, note: body.collector.note },
      transaction: null,
      failureReason: null,
      version: 1,
      createdAt: ts,
      updatedAt: ts,
    }
    const plan = paymentPlan()
    const rec = {
      order,
      purchased: q.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity })),
      ...plan,
    }
    db.orders[order.id] = rec
    db.idempotency[scoped] = { orderId: order.id, bodyHash }
    persist()
    scheduleSettlement(rec)

    if (scenario.orderTimeoutOnce && !db.consumed.orderTimeout) {
      db.consumed.orderTimeout = 1
      persist()
      await delay(CLIENT_ORDER_TIMEOUT_MS + 1500)
    }
    return HttpResponse.json(order, { status: 201 })
  }),

  http.get('*/api/orders', async ({ request }) => {
    const userId = requireUser(request)
    await settleDue()
    const items = Object.values(db.orders)
      .filter((o) => o.order.userId === userId)
      .map((o) => o.order)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json({ items })
  }),

  http.get('*/api/orders/:id', async ({ request, params }) => {
    const userId = requireUser(request)
    await settleDue()
    const rec = db.orders[String(params.id)]
    if (!rec) return fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (rec.order.userId !== userId) return fail(403, 'FORBIDDEN', 'Você não tem permissão para ver este pedido.')
    return HttpResponse.json(rec.order)
  }),
]
