/**
 * Servidor Socket.IO simulado com MSW (`ws.link`) + @mswjs/socket.io-binding.
 * O cliente real (socket.io-client, transporte WebSocket) conecta normalmente;
 * o MSW intercepta a conexão e este módulo fala o protocolo Socket.IO.
 *
 * Limitações do binding (documentadas em docs/REALTIME.md): sem namespaces,
 * rooms ou broadcast nativos e o handshake é aceito imediatamente. Por isso a
 * identidade do usuário vai no query string (`token`) e o roteamento por
 * usuário é feito aqui.
 */
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/api/contracts'
import { db, lookupSession, nextEventId, nftAvailable, nftPrice, nowIso, scenario, type OrderRecord } from './db'
import type { NftRecord } from './fixtures/nfts'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.nft-marketplace.local'
// O MSW remove o prefixo "/socket.io/" do caminho antes de comparar a URL.
export const realtimeLink = ws.link(SOCKET_URL)

interface Conn {
  id: number
  userId: string | null
  emit: (event: string, payload: unknown) => void
  close: () => void
}

const conns = new Set<Conn>()
const eventLog: { event: RealtimeEvent; userId: string | null }[] = []
let connSeq = 0
let blocked = false

export const realtimeControl = {
  /** Derruba todas as conexões ativas (o cliente reconecta sozinho). */
  dropAll() {
    conns.forEach((c) => c.close())
    conns.clear()
  },
  /** Recusa novas conexões até `unblock()`. */
  block() {
    blocked = true
    this.dropAll()
  },
  unblock() {
    blocked = false
  },
  connections: () => Array.from(conns).map((c) => ({ id: c.id, userId: c.userId })),
  log: () => eventLog.map((e) => e.event),
  /** Reenvia o último evento (duplicata exata, mesmo eventId e versão). */
  replayLast(type?: RealtimeEvent['type']) {
    const entry = [...eventLog].reverse().find((e) => !type || e.event.type === type)
    if (entry) deliver(entry.event, entry.userId)
    return entry?.event ?? null
  },
  /** Envia um evento com versão antiga e dados divergentes. */
  sendStale(nft: NftRecord) {
    const event: NftUpdatedEvent = {
      eventId: nextEventId('evt-stale'),
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: Math.max(0, nft.version - 1),
      occurredAt: new Date(Date.parse(nowIso()) - 60_000).toISOString(),
      data: {
        nftId: nft.id,
        name: nft.name,
        priceEth: '999',
        available: 0,
        editions: nft.editions.map((e) => ({ ...e, priceEth: '999', available: 0 })),
        changes: ['price', 'availability'],
      },
    }
    deliver(event, null)
    return event
  },
  reset() {
    eventLog.length = 0
    blocked = false
    this.dropAll()
  },
}

function deliver(event: RealtimeEvent, userId: string | null) {
  for (const c of conns) {
    if (userId && c.userId !== userId) continue
    c.emit(event.type, event)
  }
}

function publish(event: RealtimeEvent, userId: string | null) {
  eventLog.push({ event, userId })
  if (eventLog.length > 200) eventLog.shift()
  deliver(event, userId)
}

export function emitNftUpdated(nft: NftRecord, changes: ('price' | 'availability')[]) {
  publish(
    {
      eventId: nextEventId('evt-nft'),
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: nft.version,
      occurredAt: nowIso(),
      data: {
        nftId: nft.id,
        name: nft.name,
        priceEth: nftPrice(nft),
        available: nftAvailable(nft),
        editions: nft.editions.map((e) => ({ ...e })),
        changes,
      },
    },
    null,
  )
}

export function emitOrderUpdated(rec: OrderRecord) {
  const event: OrderUpdatedEvent = {
    eventId: nextEventId('evt-order'),
    type: 'order.updated',
    resource: { type: 'order', id: rec.order.id },
    version: rec.order.version,
    occurredAt: nowIso(),
    data: {
      orderId: rec.order.id,
      userId: rec.order.userId,
      status: rec.order.status,
      transaction: rec.order.transaction,
      failureReason: rec.order.failureReason,
    },
  }
  publish(event, rec.order.userId)
}

export const realtimeHandler = realtimeLink.addEventListener('connection', (connection) => {
  const { client } = connection
  if (blocked || scenario.offline) {
    client.close(4001, 'unavailable')
    return
  }
  const io = toSocketIo(connection)
  const token = new URL(client.url).searchParams.get('token')
  const session = lookupSession(token)
  const conn: Conn = {
    id: ++connSeq,
    userId: session.status === 'ok' ? session.userId : null,
    emit: (event, payload) => io.client.emit(event, payload),
    close: () => {
      try {
        client.close(4000, 'server dropped')
      } catch {
        /* já fechado */
      }
    },
  }
  conns.add(conn)
  // O binding não envia heartbeats; o socket.io-client encerra a conexão se
  // não receber "ping" (pacote Engine.IO "2") dentro de pingInterval+pingTimeout.
  const heartbeat = setInterval(() => {
    try {
      client.send('2')
    } catch {
      clearInterval(heartbeat)
    }
  }, 20_000)
  client.addEventListener('close', () => {
    clearInterval(heartbeat)
    conns.delete(conn)
  })
  
  io.client.on('whoami', () => io.client.emit('whoami', { userId: conn.userId }))
})

export function hasPendingOrders() {
  return Object.values(db.orders).some((o) => o.order.status === 'pending')
}
