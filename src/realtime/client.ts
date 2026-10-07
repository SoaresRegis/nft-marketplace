import type { Socket } from 'socket.io-client'
import { useSyncExternalStore } from 'react'
import { SOCKET_EVENTS, nftUpdatedEvent, orderUpdatedEvent, type NftUpdatedEvent, type OrderUpdatedEvent } from '@/api/contracts'
import { transportReady } from '@/api/transport-ready'

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface RealtimeHandlers {
  onNftUpdated: (event: NftUpdatedEvent) => void
  onOrderUpdated: (event: OrderUpdatedEvent) => void
  /** Chamado ao reconectar: reconciliar recursos ativos com a API REST. */
  onReconnect: () => void
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.nft-marketplace.local'

let state: ConnectionState = 'idle'
const stateListeners = new Set<() => void>()
function setState(next: ConnectionState) {
  if (state === next) return
  state = next
  stateListeners.forEach((l) => l())
}

export function useConnectionState() {
  return useSyncExternalStore(
    (l) => {
      stateListeners.add(l)
      return () => stateListeners.delete(l)
    },
    () => state,
  )
}

export class RealtimeClient {
  private socket: Socket | null = null
  private generation = 0

  async connect(token: string | null, handlers: RealtimeHandlers) {
    this.disconnect()
    const generation = ++this.generation
    await transportReady()
    
    const { io } = await import('socket.io-client')
    if (generation !== this.generation) return 

    setState('connecting')
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      query: token ? { token } : {},
      reconnection: true,
      reconnectionDelay: 400,
      reconnectionDelayMax: 3000,
      timeout: 5000,
    })
    this.socket = socket
    let everConnected = false

    socket.on('connect', () => {
      if (generation !== this.generation) return
      setState('connected')
      if (everConnected) handlers.onReconnect()
      everConnected = true
    })
    socket.on('disconnect', (reason) => {
      if (generation !== this.generation) return
      setState(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting')
    })
    socket.on('connect_error', () => {
      if (generation !== this.generation) return
      setState('reconnecting')
    })
    socket.on(SOCKET_EVENTS.nftUpdated, (payload: unknown) => {
      if (generation !== this.generation) return
      const parsed = nftUpdatedEvent.safeParse(payload)
      if (parsed.success) handlers.onNftUpdated(parsed.data)
    })
    socket.on(SOCKET_EVENTS.orderUpdated, (payload: unknown) => {
      if (generation !== this.generation) return
      const parsed = orderUpdatedEvent.safeParse(payload)
      if (parsed.success) handlers.onOrderUpdated(parsed.data)
    })
  }

  disconnect() {
    this.generation++
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    setState('idle')
  }
}

export const realtime = new RealtimeClient()
