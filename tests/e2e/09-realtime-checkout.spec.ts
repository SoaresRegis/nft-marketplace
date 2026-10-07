import { expect, test } from './fixtures'

test.describe('Tempo real no checkout (Socket.IO)', () => {
  test.beforeEach(async ({ app }) => {
    await app.open('/')
    await app.loginAs('ana')
    await app.addToCart('nft-01', { quantity: 2 })
  })

  test('preço muda durante a revisão: a UI avisa, atualiza o resumo e exige nova confirmação', async ({ app, page, mock }) => {
    await app.checkoutToReview()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('0.1 ETH')

    await mock.updateNft('nft-01', { editionId: 'ed-01-1', priceEth: '0.06' })

    await expect(page.getByText('Carrinho atualizado').first()).toBeVisible()
    await expect(page.getByTestId('quote-issues-alert')).toContainText('mudou de 0.05 para 0.06')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('0.12 ETH')
    await expect(page.getByTestId('confirm-order')).toBeDisabled()

    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(page.getByTestId('confirm-order')).toBeEnabled()
    await expect(page.getByTestId('confirm-order')).toContainText('0.1228 ETH')
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-items')).toContainText('(x 2)'); await expect(page.getByTestId('receipt-items')).toContainText('0.12 ETH')
  })

  test('sem o evento (socket fora), o servidor recusa a cotação desatualizada', async ({ app, page, mock }) => {
    await app.checkoutToReview()
    await mock.socket('block')
    await mock.updateNft('nft-01', { editionId: 'ed-01-1', priceEth: '0.07' })
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('quote-stale-alert')).toBeVisible()
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
    await expect(page.getByTestId('quote-issues-alert')).toBeVisible()
    expect(await app.ordersCount()).toBe(0)
    await mock.socket('unblock')
  })

  test('edição esgota durante o checkout e bloqueia a compra', async ({ app, page, mock }) => {
    await app.checkoutToReview()
    await mock.updateNft('nft-01', { editionId: 'ed-01-1', available: 0 })
    await expect(page.getByText('Há itens esgotados')).toBeVisible()
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
    await page.goto('/cart')
    await expect(page.getByTestId('cart-item').getByText('Esgotado')).toBeVisible()
    await expect(page.getByTestId('go-to-checkout')).toBeDisabled()
  })

  test('catálogo e detalhe refletem nft.updated sem recarregar', async ({ page, mock }) => {
    await page.goto('/nft/nft-01')
    await expect(page.getByTestId('edition-ed-01-1')).toHaveAttribute('aria-label', /0\.05 ETH/)
    await mock.updateNft('nft-01', { editionId: 'ed-01-1', priceEth: '0.055', available: 3 })
    await expect(page.getByTestId('edition-ed-01-1')).toHaveAttribute('aria-label', /0\.055 ETH/)
    await expect(page.getByTestId('edition-availability')).toContainText('3 de 25 disponíveis')
  })
})
