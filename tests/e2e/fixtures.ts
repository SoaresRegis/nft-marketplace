import { test as base, expect, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@nft.dev', password: 'Senha@123', name: 'Ana Colecionadora' },
  bruno: { email: 'bruno@nft.dev', password: 'Senha@123', name: 'Bruno Lima' },
} as const

/**
 * Cliente dos endpoints de controle da simulação (/__mock/*). As chamadas
 * saem da página e são atendidas pelo MSW, como qualquer requisição da app.
 */
export class MockControl {
  constructor(private readonly page: Page) {}

  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    await this.page.waitForFunction(() => (window as unknown as { __nftMockReady?: boolean }).__nftMockReady === true)
    return this.page.evaluate(
      async ({ method, path, body }) => {
        const res = await fetch(`/__mock${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(JSON.stringify(json))
        return json
      },
      { method, path, body },
    ) as Promise<T>
  }

  scenario(preset: string, overrides: Record<string, unknown> = {}) {
    return this.call('PUT', '/scenario', { preset, overrides })
  }
  updateNft(nftId: string, patch: { editionId?: string; priceEth?: string; available?: number }) {
    return this.call('POST', `/nfts/${nftId}`, patch)
  }
  expireSessions() {
    return this.call('POST', '/session/expire')
  }
  socket(action: 'drop' | 'block' | 'unblock') {
    return this.call('POST', `/socket/${action}`)
  }
  replayLast(type?: 'nft.updated' | 'order.updated') {
    return this.call('POST', '/events/replay', type ? { type } : {})
  }
  sendStale(nftId: string) {
    return this.call('POST', '/events/stale', { nftId })
  }
  settle(orderId: string, outcome: 'confirm' | 'reject') {
    return this.call('POST', `/orders/${orderId}/settle`, { outcome })
  }
  latestOrder() {
    return this.call<{ id: string; status: string }>('GET', '/orders/latest')
  }
  events() {
    return this.call<{ items: { eventId: string; type: string; version: number }[] }>('GET', '/events')
  }
}

type Fixtures = { mock: MockControl; app: App }

export class App {
  constructor(readonly page: Page, readonly mock: MockControl) {}

  async open(path = '/', opts: { scenario?: string } = {}) {
    const url = opts.scenario ? `${path}${path.includes('?') ? '&' : '?'}mock=${opts.scenario}` : path
    await this.page.goto(url)
    await this.waitForRealtime()
  }

  async openSearch() {
    const toggle = this.page.getByRole('button', { name: 'Abrir busca' })
    if (await toggle.isVisible()) await toggle.click()
    await expect(this.page.getByRole('searchbox', { name: /Buscar NFTs/ })).toBeVisible()
  }

  async waitForRealtime() {
    await expect(this.page.getByTestId('realtime-status')).toHaveAttribute('data-state', 'connected')
  }

  async loginAs(user: keyof typeof USERS) {
    const { email, password } = USERS[user]
    await this.page.evaluate(
      async ({ email, password }) => {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        const json = await res.json()
        localStorage.setItem('nft:session-token', json.token)
      },
      { email, password },
    )
    await this.page.reload()
    await this.waitForRealtime()
  }

  async loginViaForm(user: keyof typeof USERS) {
    const { email, password } = USERS[user]
    const form = this.page.getByRole('form', { name: 'Formulário de login' })
    await expect(form).toBeVisible()
    await form.getByLabel('E-mail', { exact: true }).fill(email)
    await form.getByLabel('Senha', { exact: true }).fill(password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  }

  async addToCart(nftId: string, opts: { edition?: string; quantity?: number } = {}) {
    await this.page.goto(`/nft/${nftId}${opts.edition ? `?edition=${opts.edition}` : ''}`)
    await expect(this.page.getByTestId('purchase-panel')).toBeVisible()
    if (opts.quantity && opts.quantity > 1) {
      const input = this.page.getByTestId('quantity-input')
      await input.fill(String(opts.quantity))
      await input.press('Enter')
    }
    await this.page.getByTestId('add-to-cart').click()
    await expect(this.page.getByText('Adicionado ao carrinho').first()).toBeVisible()
  }

  async checkoutToReview() {
    const page = this.page
    await page.goto('/checkout')
    await expect(page.getByTestId('confirm-order')).toBeEnabled()
  }

  async addPrimaryWallet() {
    const page = this.page
    await page.goto('/account/wallets')
    const slot = page.getByTestId('wallet-slot-primary')
    await slot.getByRole('button', { name: /Adicionar/ }).click()
    const form = slot.getByRole('form', { name: 'Carteira principal' })
    await form.getByLabel('Nome de exibição').fill('Bruno Lima')
    await form.getByLabel('Apelido da carteira').fill('Minha MetaMask')
    await form.getByLabel('Nome do perfil').fill('Bruno Coleções')
    await form.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await form.getByLabel('E-mail').fill('bruno@nft.dev')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira cadastrada').first()).toBeVisible()
  }

  async ordersCount() {
    return this.page.evaluate(async () => {
      const token = localStorage.getItem('nft:session-token')
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      return ((await res.json()).items as unknown[]).length
    })
  }

  isMobile() {
    return (this.page.viewportSize()?.width ?? 1440) < 768
  }
}

export const test = base.extend<Fixtures>({
  mock: async ({ page }, use) => {
    await use(new MockControl(page))
  },
  app: async ({ page, mock }, use) => {
    await use(new App(page, mock))
  },
})

export { expect }
