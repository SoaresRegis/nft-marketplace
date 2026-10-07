import { expect, test } from './fixtures'

test.describe('Carrinho', () => {
  test('quantidades, limite, remoção, cupom e persistência após refresh e login', async ({ app, page }) => {
    await app.open('/')
    await app.addToCart('nft-01', { quantity: 2 }) 
    await app.addToCart('nft-02')

    await page.goto('/cart')
    const items = page.getByTestId('cart-item')
    await expect(items).toHaveCount(2)
    
    if (!app.isMobile()) await expect(page.locator('[data-testid=cart-count]:visible')).toHaveText('3')

    const first = items.filter({ hasText: 'Emerald Ape #042' })
    await first.getByRole('button', { name: /Aumentar quantidade/ }).click()
    await expect(first.getByTestId('quantity-input')).toHaveValue('3')
    if (!app.isMobile()) await expect(page.locator('[data-testid=cart-count]:visible')).toHaveText('4')
    const qty = first.getByTestId('quantity-input')
    await qty.fill('50')
    await qty.press('Enter')
    await expect(qty).toHaveValue('5')

    // remover
    await items.filter({ hasNotText: 'Emerald Ape #042' }).getByRole('button', { name: /^Remover/ }).click()
    await expect(items).toHaveCount(1)
    await expect(page.getByTestId('summary-subtotal')).toHaveText('0.25 ETH')

    // cupons: inválido, expirado e válido
    const coupon = page.getByLabel('Cupom de desconto')
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-error')).toHaveText('Cupom inválido.')
    await coupon.fill('BLACK50')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-error')).toHaveText('Este cupom expirou.')
    await coupon.fill('NFT10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('applied-coupon')).toHaveText('NFT10')
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.025 ETH')
    // total = 0.25 - 0.025 + taxa (0.0021 + 5 × 0.00035 = 0.00385)
    await expect(page.getByTestId('summary-total')).toHaveText('0.22885 ETH')

    await page.reload()
    await expect(items).toHaveCount(1)
    await expect(page.getByTestId('applied-coupon')).toHaveText('NFT10')

    await page.getByRole('button', { name: 'Remover cupom NFT10' }).click()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.0 ETH')

    // login preserva os itens do visitante
    await page.goto('/login')
    await app.loginViaForm('bruno')
    await page.goto('/cart')
    await expect(items).toHaveCount(1)
    await expect(first.getByTestId('quantity-input')).toHaveValue('5')
  })

  test('erro de quantidade no servidor faz rollback da alteração otimista', async ({ app, page, mock }) => {
    await app.open('/')
    await app.addToCart('nft-01')
    await page.goto('/cart')
    const qty = page.getByTestId('cart-item').getByTestId('quantity-input')
    await mock.scenario('default', { failures: [{ method: 'PATCH', path: '^/api/cart/items', status: 503, times: 1 }] })
    await page.getByRole('button', { name: /Aumentar quantidade/ }).click()
    await expect(page.getByText('Não foi possível alterar a quantidade').first()).toBeVisible()
    await expect(qty).toHaveValue('1')
  })
})
