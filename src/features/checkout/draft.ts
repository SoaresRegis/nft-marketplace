import type { CollectorInput, Network } from '@/api/contracts'
import { readJson, writeJson } from '@/lib/storage'

export interface CheckoutDraft {
  collector: CollectorInput | null
  walletId: string | null
  network: Network
  connectedWalletId: string | null
  connectedNetwork: Network | null
  /** Tentativa atual: mesma chave de idempotência até o pedido terminar. */
  attempt: { key: string; fingerprint: string } | null
  pendingOrderId: string | null
}

const PREFIX = 'nft:checkout:v2:'

export const emptyDraft: CheckoutDraft = {
  collector: null,
  walletId: null,
  network: 'ethereum',
  connectedWalletId: null,
  connectedNetwork: null,
  attempt: null,
  pendingOrderId: null,
}

export function loadDraft(userId: string): CheckoutDraft {
  return { ...emptyDraft, ...(readJson<CheckoutDraft>(PREFIX + userId, 'session') ?? {}) }
}

export function saveDraft(userId: string, draft: CheckoutDraft) {
  writeJson(PREFIX + userId, draft, 'session')
}

export function clearDraft(userId: string) {
  writeJson(PREFIX + userId, null, 'session')
}

export function clearCheckoutDrafts() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {
  }
}
