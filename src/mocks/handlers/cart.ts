import { HttpResponse, http } from 'msw'
import { z } from 'zod'
import { addCartItemInput, couponInput, updateCartItemInput } from '@/api/contracts'
import * as money from '@/lib/money'
import { checkCoupon, db, findNft, getGuestCart, getUserCart, nextId, persist, toCart, touchCart, type CartRecord } from '../db'
import { bearer, fail, parseBody, requireUser } from '../http-utils'

function resolveCart(request: Request): CartRecord {
  if (bearer(request)) return getUserCart(requireUser(request))
  return getGuestCart(request.headers.get('X-Guest-Cart'))
}

function limitFor(nftId: string, editionId: string) {
  const nft = findNft(nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  if (!nft || !edition) return null
  return { nft, edition, limit: Math.min(edition.available, edition.maxPerOrder) }
}

function availabilityError(name: string, available: number, maxPerOrder: number, inCart: number) {
  const message =
    available === 0
      ? `${name} está esgotado nesta edição.`
      : `Quantidade indisponível para ${name}: limite de ${Math.min(available, maxPerOrder)} por pedido${inCart ? ` (${inCart} já no carrinho)` : ''}.`
  return fail(409, 'AVAILABILITY_CONFLICT', message, { details: { available, maxPerOrder, inCart }, fields: { quantity: message } })
}

function subtotalOf(cart: CartRecord) {
  return money.add('0', ...toCart(cart).items.map((i) => money.mul(i.unitPriceEth, i.quantity)))
}

export const cartHandlers = [
  http.get('*/api/cart', ({ request }) => HttpResponse.json(toCart(resolveCart(request)))),

  http.post('*/api/cart/items', async ({ request }) => {
    const cart = resolveCart(request)
    const body = await parseBody(request, addCartItemInput)
    const found = limitFor(body.nftId, body.editionId)
    if (!found) return fail(404, 'NOT_FOUND', 'NFT ou edição não encontrada.')
    const existing = cart.items.find((i) => i.editionId === body.editionId)
    const inCart = existing?.quantity ?? 0
    if (inCart + body.quantity > found.limit) {
      return availabilityError(`${found.nft.name} (${found.edition.name})`, found.edition.available, found.edition.maxPerOrder, inCart)
    }
    if (existing) {
      existing.quantity += body.quantity
      existing.acknowledgedPriceEth = found.edition.priceEth
    } else {
      cart.items.push({
        id: nextId('ci'),
        nftId: body.nftId,
        editionId: body.editionId,
        quantity: body.quantity,
        acknowledgedPriceEth: found.edition.priceEth,
      })
    }
    touchCart(cart)
    return HttpResponse.json(toCart(cart), { status: 201 })
  }),

  http.patch('*/api/cart/items/:itemId', async ({ request, params }) => {
    const cart = resolveCart(request)
    const body = await parseBody(request, updateCartItemInput)
    const item = cart.items.find((i) => i.id === params.itemId)
    if (!item) return fail(404, 'NOT_FOUND', 'Item não está no carrinho.')
    const found = limitFor(item.nftId, item.editionId)
    if (!found) return fail(404, 'NOT_FOUND', 'NFT ou edição não encontrada.')
    if (body.quantity > found.limit && body.quantity > item.quantity) {
      return availabilityError(`${found.nft.name} (${found.edition.name})`, found.edition.available, found.edition.maxPerOrder, 0)
    }
    item.quantity = body.quantity
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  http.delete('*/api/cart/items/:itemId', ({ request, params }) => {
    const cart = resolveCart(request)
    const before = cart.items.length
    cart.items = cart.items.filter((i) => i.id !== params.itemId)
    if (cart.items.length === before) return fail(404, 'NOT_FOUND', 'Item não está no carrinho.')
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  /** O usuário confirma que viu as alterações de preço/estoque. */
  http.post('*/api/cart/acknowledge', ({ request }) => {
    const cart = resolveCart(request)
    for (const item of cart.items) {
      const found = limitFor(item.nftId, item.editionId)
      if (!found) continue
      item.acknowledgedPriceEth = found.edition.priceEth
      if (found.edition.available > 0 && item.quantity > found.limit) item.quantity = found.limit
    }
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  http.put('*/api/cart/coupon', async ({ request }) => {
    const cart = resolveCart(request)
    const { code } = await parseBody(request, couponInput)
    if (!cart.items.length) return fail(422, 'VALIDATION_ERROR', 'Adicione itens antes de aplicar um cupom.', { fields: { code: 'Carrinho vazio.' } })
    const check = checkCoupon(code, subtotalOf(cart))
    if (!check.ok) return fail(422, check.code, check.message, { fields: { code: check.message } })
    cart.couponCode = check.rule.code
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  http.delete('*/api/cart/coupon', ({ request }) => {
    const cart = resolveCart(request)
    cart.couponCode = null
    touchCart(cart)
    return HttpResponse.json(toCart(cart))
  }),

  http.post('*/api/cart/merge', async ({ request }) => {
    const userId = requireUser(request)
    const { guestCartId } = await parseBody(request, z.object({ guestCartId: z.string() }))
    const cart = getUserCart(userId)
    const guest = db.carts[guestCartId]
    if (guest && guest.ownerId === null) {
      for (const g of guest.items) {
        const found = limitFor(g.nftId, g.editionId)
        if (!found || found.limit === 0) continue
        const existing = cart.items.find((i) => i.editionId === g.editionId)
        if (existing) {
          existing.quantity = Math.min(found.limit, existing.quantity + g.quantity)
        } else {
          cart.items.push({ ...g, id: nextId('ci'), quantity: Math.min(found.limit, g.quantity) })
        }
      }
      if (!cart.couponCode && guest.couponCode) cart.couponCode = guest.couponCode
      delete db.carts[guestCartId]
      touchCart(cart)
    }
    persist()
    return HttpResponse.json(toCart(cart))
  }),
]
