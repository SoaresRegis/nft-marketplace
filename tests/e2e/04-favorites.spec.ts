import { expect, test } from './fixtures'

test.describe('Favoritos', () => {
  test('visitante é levado ao login e volta', async ({ app, page }) => {
    await app.open('/nft/nft-05')
    await page.getByTestId('detail-favorite').click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnft%2Fnft-05/)
    await app.loginViaForm('bruno')
    await expect(page).toHaveURL(/\/nft\/nft-05/)
  })

  test('favoritar persiste; falha da mutation faz rollback e a nova tentativa funciona', async ({ app, page, mock }) => {
    await app.open('/')
    await app.loginAs('bruno')
    await page.goto('/nft/nft-05')
    const button = page.getByTestId('detail-favorite')
    await expect(button).toHaveAttribute('aria-pressed', 'false')

    // falha uma vez no servidor
    // latência fixa para a atualização otimista ficar observável antes do rollback
    await mock.scenario('default', { latency: { mode: 'fixed', ms: 700, jitter: 0 }, failures: [{ method: 'PUT', path: '^/api/me/favorites', status: 500, times: 1 }] })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true') // otimista
    await expect(page.getByText(/Não foi possível favoritar/).first()).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'false') // rollback

    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('live-polite')).toContainText('adicionado aos favoritos')
    await page.reload()
    await expect(page.getByTestId('detail-favorite')).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/account/favorites')
    await expect(page.getByTestId('favorites-grid').getByTestId('nft-card')).toHaveCount(1)
  })
})
