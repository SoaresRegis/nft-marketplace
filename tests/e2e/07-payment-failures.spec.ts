import { expect, test } from './fixtures'

test.describe('Falhas de pagamento e idempotência', () => {
  test.beforeEach(async ({ app }) => {
    await app.open('/')
    await app.loginAs('ana')
    await app.addToCart('nft-01', { quantity: 2 })
  })

  test('pagamento recusado mantém os itens no carrinho', async ({ app, page, mock }) => {
    await mock.scenario('payment-rejected')
    await app.checkoutToReview()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-rejected')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('order-confirmed')).toHaveCount(0)
    await page.getByRole('link', { name: 'Ver carrinho' }).click()
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('cart-item').getByTestId('quantity-input')).toHaveValue('2')
  })

  test('cliques repetidos geram um único pedido', async ({ app, page, mock }) => {
    await mock.scenario('default', { latency: { mode: 'fixed', ms: 800, jitter: 0 } })
    await app.checkoutToReview()
    const confirm = page.getByTestId('confirm-order')
    await confirm.click()
    await confirm.click({ force: true, noWaitAfter: true }).catch(() => undefined)
    await confirm.click({ force: true, noWaitAfter: true }).catch(() => undefined)
    await expect(page).toHaveURL(/\/orders\/ord-/)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(await app.ordersCount()).toBe(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela chave de idempotência', async ({ app, page, mock }) => {
    await mock.scenario('order-timeout')
    await app.checkoutToReview()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-submitting')).toBeVisible()
    // A janela de nova tentativa é curta (~1 s): waitFor observa o DOM em vez de consultar em intervalos.
    await page.getByTestId('order-submitting').filter({ hasText: 'Verificando o mesmo pedido' }).waitFor({ timeout: 12_000 })
    await expect(page).toHaveURL(/\/orders\/ord-/, { timeout: 15_000 })
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(await app.ordersCount()).toBe(1)
  })

  test('mesma chave com conteúdo diferente gera conflito na API', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('nft:session-token')
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': 'chave-teste-123' }
      const quote = await (await fetch('/api/quotes', { method: 'POST', headers, body: JSON.stringify({ network: 'ethereum' }) })).json()
      await fetch('/api/me/wallets/wal-ana-1/connect', { method: 'POST', headers, body: JSON.stringify({ network: 'ethereum' }) })
      const body = (country: string) => JSON.stringify({ quoteId: quote.id, walletId: 'wal-ana-1', network: 'ethereum', collector: { fullName: 'Ana C', username: 'ana', profileName: 'Ana Coleções', email: 'ana@nft.dev', ensName: '', referralCode: '', note: country } })
      const a = await fetch('/api/orders', { method: 'POST', headers, body: body('Brasil') })
      const first = await a.json()
      const b = await fetch('/api/orders', { method: 'POST', headers, body: body('Brasil') })
      const again = await b.json()
      const c = await fetch('/api/orders', { method: 'POST', headers, body: body('Portugal') })
      return { firstStatus: a.status, same: first.id === again.id, replayed: b.headers.get('Idempotent-Replayed'), conflict: c.status, code: (await c.json()).error.code }
    })
    expect(result).toEqual({ firstStatus: 201, same: true, replayed: 'true', conflict: 409, code: 'IDEMPOTENCY_CONFLICT' })
  })
})
