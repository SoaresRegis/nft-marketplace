import { expect, test } from './fixtures'

test.describe('Resiliência do tempo real', () => {
  test('eventos duplicados e antigos não regridem o estado', async ({ app, page, mock }) => {
    await app.open('/nft/nft-01')
    const edition = page.getByTestId('edition-ed-01-1')
    await mock.updateNft('nft-01', { editionId: 'ed-01-1', priceEth: '0.07' })
    await expect(edition).toHaveAttribute('aria-label', /0\.07 ETH/)

    await mock.replayLast('nft.updated') // duplicata exata
    await mock.sendStale('nft-01') 
    await page.waitForTimeout(500)
    await expect(edition).toHaveAttribute('aria-label', /0\.07 ETH/)
    await expect(edition).not.toHaveAttribute('aria-label', /999/)
  })

  test('após desconexão, reconcilia com a API REST', async ({ app, page, mock }) => {
    await app.open('/nft/nft-01')
    const edition = page.getByTestId('edition-ed-01-1')
    await mock.socket('block')
    await expect(page.getByTestId('realtime-status')).toHaveAttribute('data-state', 'reconnecting')
    await expect(page.getByRole('status').filter({ hasText: 'Reconectando' })).toBeVisible()
    await mock.updateNft('nft-01', { editionId: 'ed-01-1', priceEth: '0.08' }) // evento perdido
    await page.waitForTimeout(300)
    await expect(edition).toHaveAttribute('aria-label', /0\.05 ETH/)
    await mock.socket('unblock')
    await app.waitForRealtime()
    await expect(edition).toHaveAttribute('aria-label', /0\.08 ETH/)
  })

  test('pedido pendente sobrevive a queda de conexão e refresh sem nova compra', async ({ app, page, mock }) => {
    await app.open('/')
    await app.loginAs('ana')
    await app.addToCart('nft-01')
    await mock.scenario('payment-manual')
    await app.checkoutToReview()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const orderUrl = page.url()

    await mock.socket('block')
    await page.reload()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    expect(page.url()).toBe(orderUrl)

    // checkout mostra o pedido em andamento e não permite outro envio
    await page.goto('/checkout')
    await expect(page.getByTestId('pending-order-notice')).toBeVisible()

    const order = await mock.latestOrder()
    await mock.settle(order.id, 'confirm') // evento perdido (socket bloqueado)
    await page.goto(orderUrl)
    await mock.socket('unblock')
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    expect(await app.ordersCount()).toBe(1)

    await mock.settle(order.id, 'reject')
    await page.reload()
    await expect(page.getByTestId('order-confirmed')).toBeVisible()
  })

  test('evento de pedido de outro usuário é ignorado', async ({ app, page, mock }) => {
    await app.open('/')
    await app.loginAs('ana')
    await app.addToCart('nft-01')
    await mock.scenario('payment-manual')
    await app.checkoutToReview()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const order = await mock.latestOrder()

    // troca para Bruno; o pedido de Ana é confirmado depois
    await app.loginAs('bruno')
    await mock.settle(order.id, 'confirm')
    await page.waitForTimeout(500)
    await expect(page.getByText('Pedido confirmado')).toHaveCount(0)
    await page.goto(`/orders/${order.id}`)
    await expect(page.getByText('Pedido não encontrado')).toBeVisible()
  })
})
