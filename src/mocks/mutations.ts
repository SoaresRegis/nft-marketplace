import * as money from '@/lib/money'
import { db, findNft, getUserCart, now, nowIso, persist, scenario, sha256, touchCart, type OrderRecord } from './db'
import { emitNftUpdated, emitOrderUpdated } from './realtime'

export function updateEdition(nftId: string, editionId: string | undefined, patch: { priceEth?: string; available?: number }) {
  const nft = findNft(nftId)
  if (!nft) return null
  const edition = editionId ? nft.editions.find((e) => e.id === editionId) : nft.editions[0]
  if (!edition) return null
  const changes: ('price' | 'availability')[] = []
  if (patch.priceEth !== undefined && !money.eq(patch.priceEth, edition.priceEth)) {
    edition.priceEth = patch.priceEth
    changes.push('price')
  }
  if (patch.available !== undefined && patch.available !== edition.available) {
    edition.available = Math.max(0, Math.min(edition.supply, patch.available))
    changes.push('availability')
  }
  if (!changes.length) return nft
  nft.version += 1
  persist()
  emitNftUpdated(nft, changes)
  return nft
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function scheduleSettlement(rec: OrderRecord) {
  if (rec.order.status !== 'pending' || rec.settleAt === null) return
  clearTimeout(timers.get(rec.order.id))
  timers.set(
    rec.order.id,
    setTimeout(() => void settleOrder(rec.order.id, rec.outcome === 'reject' ? 'reject' : 'confirm'), Math.max(0, rec.settleAt - now())),
  )
}

export async function settleDue() {
  const due: Promise<unknown>[] = []
  for (const rec of Object.values(db.orders)) {
    if (rec.order.status === 'pending' && rec.settleAt !== null) {
      if (rec.settleAt <= now()) due.push(settleOrder(rec.order.id, rec.outcome === 'reject' ? 'reject' : 'confirm'))
      else scheduleSettlement(rec)
    }
  }
  await Promise.all(due)
}

export async function settleOrder(orderId: string, outcome: 'confirm' | 'reject', reason?: string) {
  const rec = db.orders[orderId]
  if (!rec || rec.order.status !== 'pending') return rec ?? null 
  clearTimeout(timers.get(orderId))
  timers.delete(orderId)
  const order = rec.order
  let finalOutcome = outcome
  let failureReason = reason ?? 'Pagamento recusado pela carteira (simulação).'

  if (finalOutcome === 'confirm') {
    for (const p of rec.purchased) {
      const ed = db.nfts.find((n) => n.id === p.nftId)?.editions.find((e) => e.id === p.editionId)
      if (!ed || ed.available < p.quantity) {
        finalOutcome = 'reject'
        failureReason = 'Uma das edições esgotou antes da confirmação. Nenhum valor foi cobrado.'
        break
      }
    }
  }

  if (finalOutcome === 'confirm') {
    for (const p of rec.purchased) {
      const nft = db.nfts.find((n) => n.id === p.nftId)!
      const ed = nft.editions.find((e) => e.id === p.editionId)!
      ed.available -= p.quantity
      nft.version += 1
      emitNftUpdated(nft, ['availability'])
    }
    // Remove do carrinho apenas o que foi comprado.
    const cart = getUserCart(order.userId)
    for (const p of rec.purchased) {
      const item = cart.items.find((i) => i.editionId === p.editionId)
      if (!item) continue
      item.quantity -= p.quantity
    }
    cart.items = cart.items.filter((i) => i.quantity > 0)
    if (order.coupon && cart.couponCode === order.coupon.code && cart.items.length === 0) cart.couponCode = null
    touchCart(cart)
    const hash = `0x${await sha256(`${order.id}:${order.createdAt}`)}`
    order.status = 'confirmed'
    order.transaction = {
      hash,
      explorerUrl: `https://explorer.simulado.local/${order.network}/tx/${hash}`,
      blockNumber: 19_000_000 + (parseInt(hash.slice(2, 8), 16) % 100_000),
    }
  } else {
    order.status = 'rejected'
    order.failureReason = failureReason
  }
  order.version += 1
  order.updatedAt = nowIso()
  persist()
  emitOrderUpdated(rec)
  return rec
}

export function paymentPlan(): { settleAt: number | null; outcome: OrderRecord['outcome'] } {
  const { outcome, delayMs } = scenario.payment
  if (outcome === 'manual') return { settleAt: null, outcome }
  return { settleAt: now() + delayMs, outcome }
}
