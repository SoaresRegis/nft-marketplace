import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/** Regressão visual com dados estáveis (fixtures determinísticas). */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    await document.fonts.ready
   
    const imgs = [...document.images]
    imgs.forEach((img) => (img.loading = 'eager'))
    await Promise.all(
      imgs.map((img) =>
        img.complete ? null : new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }) }),
      ),
    )
  })
  
  await page.evaluate(() => document.querySelectorAll('[data-sonner-toaster], [data-testid=mock-panel-trigger]').forEach((t) => t.remove()))
}

test.describe('Regressão visual', () => {

  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('início', async ({ app, page }) => {
    await app.open('/')
    await expect(page.getByTestId('nft-grid')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe', async ({ app, page }) => {
    await app.open('/nft/nft-01')
    await expect(page.getByTestId('purchase-panel')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Mais de/ })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ app, page }) => {
    await app.open('/')
    await app.addToCart('nft-01', { quantity: 2 })
    await app.addToCart('nft-07')
    await page.goto('/cart')
    await expect(page.getByTestId('summary-total')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ app, page }) => {
    await app.open('/')
    await app.loginAs('ana')
    await app.addToCart('nft-01', { quantity: 2 })
    await app.checkoutToReview()
    await expect(page.getByTestId('summary-total')).toHaveText(/ETH/)
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento-revisao.png', { fullPage: true })
  })
})
