import { expect, test } from './fixtures'

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado, preservando o carrinho do visitante no login', async ({ app, page }) => {
    await app.open('/')
    // catálogo -> detalhe
    await page.getByTestId('nft-card').first().getByRole('link').click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await app.addToCart('nft-01', { quantity: 2 })

    await page.goto('/cart')
    await expect(page.getByTestId('cart-item')).toHaveCount(1)
    await expect(page.getByTestId('summary-total')).toBeVisible()
    await page.getByTestId('go-to-checkout').click()

    // checkout exige login e retorna ao fluxo
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await app.loginViaForm('bruno')
    await expect(page).toHaveURL(/\/checkout/)

    // Bruno não tem carteiras: o pagamento leva ao cadastro e o rascunho fica salvo
    await page.getByRole('link', { name: 'Cadastre uma carteira' }).first().click()
    await expect(page).toHaveURL(/\/account\/wallets/)
    await app.addPrimaryWallet()
    await page.goto('/checkout')

    const confirm = page.getByTestId('confirm-order')
    await expect(confirm).toBeEnabled()
    const totalText = await page.getByTestId('summary-total').textContent()
    await confirm.click()
    // Confirmar conecta a carteira (simulada) e cria o pedido
    await expect(page).toHaveURL(/\/orders\/ord-/)
    await expect(page.getByTestId('order-pending').or(page.getByTestId('order-confirmed'))).toBeVisible()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-items')).toContainText('(x 2)')
    await expect(page.getByTestId('summary-total')).toHaveText(totalText!)
    await expect(page.getByTestId('receipt-tx')).toHaveAttribute('data-hash', /^0x[0-9a-f]{64}$/)

    // apenas os itens comprados saem do carrinho
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })
})
