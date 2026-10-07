import type {
  Cart,
  CartItem,
  NftDetail,
  NftSummary,
  Network,
  Order,
  Quote,
  QuoteIssue,
  QuoteLine,
  User,
  Wallet,
  WalletConnection,
} from '@/api/contracts'
import * as money from '@/lib/money'
import Big from 'big.js'
import { buildNfts, type NftRecord } from './fixtures/nfts'
import { buildUsers, buildWallets, coupons, type UserRecord } from './fixtures/users'
import { buildScenario, type PresetName, type ScenarioConfig } from './scenarios'

const DB_KEY = 'nft-mock:db:v3'
const SCENARIO_KEY = 'nft-mock:scenario:v1'

export interface CartRecord {
  id: string
  ownerId: string | null
  items: { id: string; nftId: string; editionId: string; quantity: number; acknowledgedPriceEth: string }[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface QuoteRecord {
  quote: Quote
  userId: string
  fingerprint: string
}

export interface OrderRecord {
  order: Order
  purchased: { nftId: string; editionId: string; quantity: number }[]
  settleAt: number | null
  outcome: 'confirm' | 'reject' | 'manual'
}

export interface DbState {
  schema: 1
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: { token: string; userId: string; expiresAt: number }[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  userCarts: Record<string, string>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, { orderId: string; bodyHash: string }>
  wallets: Record<string, Wallet[]>
  walletConnections: Record<string, WalletConnection | null>
  eventSeq: number
  idSeq: number
  consumed: Record<string, number>
  newsletter: string[]
}

function initialState(): DbState {
  return {
    schema: 1,
    nfts: buildNfts(),
    users: buildUsers(),
    sessions: [],
    favorites: { 'usr-ana': ['nft-02', 'nft-08'], 'usr-bruno': [] },
    carts: {},
    userCarts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: buildWallets(),
    walletConnections: {},
    eventSeq: 0,
    idSeq: 1000,
    consumed: {},
    newsletter: [],
  }
}

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota/indisponível: mantém só em memória */
  }
}

export let db: DbState = load<DbState>(DB_KEY) ?? initialState()
export let scenario: ScenarioConfig = load<ScenarioConfig>(SCENARIO_KEY) ?? buildScenario('default')

export function persist() {
  save(DB_KEY, db)
}

export function setScenario(next: ScenarioConfig) {
  scenario = next
  save(SCENARIO_KEY, scenario)
}

export function resetDb(preset: PresetName = 'default', overrides: Partial<ScenarioConfig> = {}) {
  db = initialState()
  setScenario(buildScenario(preset, overrides))
  persist()
}

export const now = () => Date.now()
export const nowIso = () => new Date(now()).toISOString()
export function nextId(prefix: string) {
  db.idSeq += 1
  return `${prefix}-${db.idSeq.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ------------------------------------------------------------------ users --

export function toUser(u: UserRecord): User {
  return { id: u.id, name: u.name, username: u.username, email: u.email, bio: u.bio, ensName: u.ensName, walletNickname: u.walletNickname, avatarUrl: u.avatarUrl, createdAt: u.createdAt }
}

export function findUser(id: string) {
  return db.users.find((u) => u.id === id)
}

export function createSession(userId: string) {
  const token = `tok_${crypto.randomUUID().replace(/-/g, '')}`
  const expiresAt = now() + scenario.sessionTtlMs
  db.sessions.push({ token, userId, expiresAt })
  persist()
  return { token, expiresAt }
}

export type SessionLookup = { status: 'none' } | { status: 'expired' } | { status: 'ok'; userId: string; expiresAt: number; token: string }

export function lookupSession(token: string | null): SessionLookup {
  if (!token) return { status: 'none' }
  const s = db.sessions.find((x) => x.token === token)
  if (!s) return { status: 'expired' }
  if (s.expiresAt <= now()) return { status: 'expired' }
  return { status: 'ok', userId: s.userId, expiresAt: s.expiresAt, token: s.token }
}

// ------------------------------------------------------------------- nfts --

export function findNft(id: string) {
  return db.nfts.find((n) => n.id === id)
}

export function nftAvailable(n: NftRecord) {
  return n.editions.reduce((acc, e) => acc + e.available, 0)
}

export function nftPrice(n: NftRecord) {
  const open = n.editions.filter((e) => e.available > 0)
  const pool = open.length ? open : n.editions
  return pool.reduce((m, e) => money.min(m, e.priceEth), pool[0].priceEth)
}

export function toSummary(n: NftRecord): NftSummary {
  return {
    id: n.id,
    name: n.name,
    image: n.image,
    creator: n.creator,
    category: n.category,
    chain: n.chain,
    priceEth: nftPrice(n),
    compareAtPriceEth: n.onSale ? new Big(nftPrice(n)).times('1.15').round(2, Big.roundUp).toString() : null,
    highestBidEth: n.highestBidEth,
    available: nftAvailable(n),
    likes: n.likes,
    createdAt: n.createdAt,
    featured: n.featured,
    version: n.version,
  }
}

export function toDetail(n: NftRecord): NftDetail {
  return {
    ...toSummary(n),
    description: n.description,
    gallery: n.gallery,
    editions: n.editions.map((e) => ({ ...e })),
    tags: n.tags,
    contractAddress: n.contractAddress,
    tokenStandard: n.tokenStandard,
    tokenId: n.tokenId,
    collection: n.collection,
    attributes: n.attributes,
    royaltyPercent: n.royaltyPercent,
    rating: ratingOf(n),
    reviews: n.reviews,
  }
}

function ratingOf(n: NftRecord) {
  const avg = n.reviews.reduce((acc, r) => acc + r.rating, 0) / Math.max(1, n.reviews.length)
  return { average: Math.round(avg * 10) / 10, count: n.reviewCount }
}

// ------------------------------------------------------------------- cart --

export function getUserCart(userId: string): CartRecord {
  let id = db.userCarts[userId]
  if (!id || !db.carts[id]) {
    id = nextId('cart')
    db.carts[id] = { id, ownerId: userId, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
    db.userCarts[userId] = id
    persist()
  }
  return db.carts[id]
}

export function getGuestCart(guestId: string | null): CartRecord {
  if (guestId && db.carts[guestId] && db.carts[guestId].ownerId === null) return db.carts[guestId]
  const id = nextId('guest')
  db.carts[id] = { id, ownerId: null, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
  persist()
  return db.carts[id]
}

export function touchCart(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
  persist()
}

export function toCart(cart: CartRecord): Cart {
  const items: CartItem[] = []
  for (const it of cart.items) {
    const nft = findNft(it.nftId)
    const edition = nft?.editions.find((e) => e.id === it.editionId)
    if (!nft || !edition) continue
    items.push({
      id: it.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      editionName: edition.name,
      tokenId: nft.tokenId,
      image: nft.image,
      chain: nft.chain,
      quantity: it.quantity,
      unitPriceEth: edition.priceEth,
      acknowledgedPriceEth: it.acknowledgedPriceEth,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      priceChanged: !money.eq(edition.priceEth, it.acknowledgedPriceEth),
      exceedsAvailability: it.quantity > edition.available,
    })
  }
  return { id: cart.id, ownerId: cart.ownerId, items, couponCode: cart.couponCode, version: cart.version, updatedAt: cart.updatedAt }
}

// ---------------------------------------------------------------- coupons --

export type CouponCheck =
  | { ok: true; rule: (typeof coupons)[number] }
  | { ok: false; code: 'COUPON_INVALID' | 'COUPON_EXPIRED'; message: string }

export function checkCoupon(code: string, subtotal: string): CouponCheck {
  const rule = coupons.find((c) => c.code === code.trim().toUpperCase())
  if (!rule) return { ok: false, code: 'COUPON_INVALID', message: 'Cupom inválido.' }
  if (Date.parse(rule.expiresAt) <= now()) return { ok: false, code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' }
  if (rule.minSubtotal && money.cmp(subtotal, rule.minSubtotal) < 0) {
    return { ok: false, code: 'COUPON_INVALID', message: `Cupom válido para pedidos a partir de ${rule.minSubtotal} ETH.` }
  }
  return { ok: true, rule }
}

// ------------------------------------------------------------------ quote --

const NETWORK_FEES: Record<Network, { base: string; perItem: string }> = {
  ethereum: { base: '0.0021', perItem: '0.00035' },
  polygon: { base: '0.00012', perItem: '0.00002' },
  solana: { base: '0.00045', perItem: '0.00008' },
}

export function computeQuote(cart: CartRecord, userId: string, network: Network): QuoteRecord {
  const view = toCart(cart)
  const lines: QuoteLine[] = []
  const issues: QuoteIssue[] = []
  for (const item of view.items) {
    if (item.available === 0) {
      issues.push({ type: 'SOLD_OUT', itemId: item.id, message: `${item.name} (${item.editionName}) esgotou.` })
    } else if (item.exceedsAvailability) {
      issues.push({
        type: 'INSUFFICIENT_AVAILABILITY',
        itemId: item.id,
        message: `${item.name} (${item.editionName}): restam apenas ${item.available}.`,
      })
    }
    if (item.priceChanged) {
      issues.push({
        type: 'PRICE_CHANGED',
        itemId: item.id,
        message: `O preço de ${item.name} mudou de ${item.acknowledgedPriceEth} para ${item.unitPriceEth} ETH.`,
      })
    }
    lines.push({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      editionName: item.editionName,
      tokenId: item.tokenId,
      image: item.image,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      lineTotalEth: money.mul(item.unitPriceEth, item.quantity),
    })
  }
  const subtotal = money.add(...lines.map((l) => l.lineTotalEth), '0')
  const units = lines.reduce((a, l) => a + l.quantity, 0)
  const feeRule = NETWORK_FEES[network]
  let fee = lines.length ? money.add(feeRule.base, money.mul(feeRule.perItem, units)) : '0'
  let discount = '0'
  let coupon: Quote['coupon'] = null
  if (cart.couponCode) {
    const check = checkCoupon(cart.couponCode, subtotal)
    if (check.ok) {
      coupon = { code: check.rule.code, description: check.rule.description }
      if (check.rule.kind === 'percent') discount = money.pct(subtotal, Number(check.rule.value))
      if (check.rule.kind === 'fixed') discount = money.min(check.rule.value, subtotal)
      if (check.rule.kind === 'free-fee') fee = '0'
    } else {
      issues.push({ type: check.code, message: check.message })
    }
  }
  const total = money.add(money.sub(subtotal, discount), fee)
  const created = now()
  const quote: Quote = {
    id: nextId('qt'),
    cartVersion: cart.version,
    network,
    lines,
    coupon,
    subtotalEth: subtotal,
    discountEth: discount,
    networkFeeEth: fee,
    totalEth: total,
    issues,
    valid: lines.length > 0 && issues.length === 0,
    expiresAt: new Date(created + 10 * 60_000).toISOString(),
    createdAt: new Date(created).toISOString(),
  }
  const fingerprint = JSON.stringify({
    lines: lines.map((l) => [l.editionId, l.quantity, l.unitPriceEth]),
    coupon: coupon?.code ?? null,
    discount,
    fee,
    total,
    network,
    issues: issues.map((i) => i.type),
  })
  return { quote, userId, fingerprint }
}

// ----------------------------------------------------------------- events --

export function nextEventId(prefix: string) {
  db.eventSeq += 1
  persist()
  return `${prefix}-${db.eventSeq}`
}
