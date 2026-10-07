import { expect, test } from './fixtures'

test.describe('Carregamento, falha e recuperação', () => {
  test('skeletons durante rede lenta no catálogo, detalhe e resumo do carrinho', async ({ app, page, mock }) => {
    await app.open('/', { scenario: 'slow' })
    await expect(page.getByTestId('nft-card-skeleton').first()).toBeVisible()
    await expect(page.getByTestId('nft-grid')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('nft-card-skeleton')).toHaveCount(0)

    await page.goto('/nft/nft-01')
    await expect(page.getByTestId('detail-skeleton')).toBeVisible()
    await expect(page.getByTestId('purchase-panel')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('add-to-cart').click()
    await expect(page.getByText('Adicionado ao carrinho').first()).toBeVisible({ timeout: 10_000 })

    await page.goto('/cart')
    await expect(page.getByTestId('summary-skeleton')).toBeVisible()
    await expect(page.getByTestId('summary-total')).toBeVisible({ timeout: 10_000 })
    await mock.scenario('default')
  })

  test('falha do servidor mostra erro e o botão de nova tentativa recupera', async ({ page, mock }) => {
    await page.goto('/?mock=server-error')
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await mock.scenario('default')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('nft-grid')).toBeVisible()
  })

  test('falha transitória é repetida automaticamente', async ({ page }) => {
    await page.goto('/?mock=flaky')
    await expect(page.getByTestId('nft-grid')).toBeVisible({ timeout: 10_000 })
  })

  test('sem conexão: feedback de erro de rede', async ({ page, mock }) => {
    await page.goto('/?mock=offline')
    await expect(page.getByText('Sem conexão com o servidor').first()).toBeVisible({ timeout: 15_000 })
    await mock.scenario('default')
  })
})
