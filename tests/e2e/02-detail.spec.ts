import { expect, test } from './fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto com galeria, edição e limite de quantidade', async ({ app, page }) => {
    await app.open('/nft/nft-01')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    
    const tabs = page.getByRole('tab')
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('gallery-main')).toHaveAttribute('src', /\/art\/nomad/)

    // limite: edição Standard tem 5 disponíveis, máx. 5 por pedido
    await expect(page.getByTestId('quantity-limit')).toHaveText(/Limite de 5 por pedido/)
    const input = page.getByTestId('quantity-input')
    await input.fill('99')
    await input.press('Enter')
    await expect(input).toHaveValue('5')
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect(page.getByTestId('detail-total')).toHaveText('0.25 ETH')
  })

  test('NFT inexistente mostra estado de não encontrado', async ({ app, page }) => {
    await app.open('/nft/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao marketplace' }).click()
    await expect(page).toHaveURL('/')
  })

  test('edição indisponível e edição esgotada', async ({ app, page }) => {
    // edição inexistente na URL
    await app.open('/nft/nft-02?edition=ed-xx')
    await expect(page.getByText('Edição indisponível')).toBeVisible()
    // nft-03 tem a 2ª edição esgotada (fixture determinística)
    await page.goto('/nft/nft-03?edition=ed-03-2')
    await expect(page.getByTestId('edition-unavailable')).toBeVisible()
    await expect(page.getByTestId('add-to-cart')).toBeDisabled()
  })

  test('rota inexistente mostra 404', async ({ app, page }) => {
    await app.open('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
