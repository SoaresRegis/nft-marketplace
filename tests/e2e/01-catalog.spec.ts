import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

async function apiTotal(page: Page, query: string) {
  return page.evaluate(async (q) => (await (await fetch(`/api/nfts?${q}`)).json()).total as number, query)
}

async function resultsCount(page: Page) {
  const text = (await page.getByTestId('results-count').textContent()) ?? ''
  return Number(text.match(/(\d+) resultado/)?.[1])
}

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e histórico', async ({ app, page }) => {
    test.skip(app.isMobile(), 'Filtros laterais no desktop; o drawer móvel tem teste próprio')
    await app.open('/')
    await expect(page.getByTestId('results-count')).toHaveText(/60 resultados/)

    const pagination = page.getByRole('navigation', { name: 'Paginação' })
    await pagination.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(pagination.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    const panel = page.getByTestId('filter-panel')
    const listRequest = page.waitForRequest((r) => r.url().includes('/api/nfts?') && r.url().includes('category=digital-art'))
    await panel.getByRole('checkbox', { name: /^Arte digital/ }).check()
    await listRequest
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page).toHaveURL(/category=digital-art/)
    const artOnly = await apiTotal(page, 'category=digital-art')
    await expect(page.getByTestId('results-count')).toHaveText(new RegExp(`^${artOnly} resultado`))

    const combined = page.waitForRequest((r) => /category=digital-art&category=music/.test(r.url()) && r.url().includes('view=trending'))
    await panel.getByRole('checkbox', { name: /^Música/ }).check()
    await page.getByRole('button', { name: 'Em alta' }).click()
    await combined
    await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')
    const expected = await apiTotal(page, 'category=digital-art&category=music&view=trending')
    await expect(page.getByTestId('results-count')).toHaveText(new RegExp(`^${expected} resultado`))
    const trendingMusic = await page.evaluate(async () => (await (await fetch('/api/nfts?view=trending')).json()).facets.categories.music as number)
    await expect(panel.getByRole('checkbox', { name: /^Música/ })).toHaveAccessibleName(new RegExp(`\\(${trendingMusic}\\)`))

    await page.getByTestId('sort-select').click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(page.getByTestId('nft-grid')).not.toHaveAttribute('aria-busy', 'true')
    const prices = (await page.getByTestId('nft-grid').getByTestId('nft-card-price').allTextContents()).map((t) => Number.parseFloat(t))
    expect(prices.length).toBeGreaterThan(1)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)

    await app.openSearch()
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('ape')
    await expect(page).toHaveURL(/q=ape/)
    const withSearch = await apiTotal(page, 'q=ape&category=digital-art&category=music&view=trending')
    await expect(page.getByTestId('results-count')).toHaveText(new RegExp(`^${withSearch} resultado`))

    await page.goBack()
    await expect(page).not.toHaveURL(/q=ape/)
    await expect(page.getByRole('searchbox', { name: /Buscar NFTs/ })).toHaveValue('')
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=price-asc/)
    await expect(page.getByTestId('sort-select')).toHaveText('Listados recentemente')
    await page.goForward()
    await expect(page.getByTestId('sort-select')).toHaveText('Menor preço')

    await page.reload()
    await expect(panel.getByRole('checkbox', { name: /^Arte digital/ })).toBeChecked()
    await expect(panel.getByRole('checkbox', { name: /^Música/ })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('results-count')).toHaveText(new RegExp(`^${expected} resultado`))
  })

  test('drawer de filtros no mobile compõe a URL', async ({ app, page }) => {
    test.skip(!app.isMobile(), 'somente mobile')
    await app.open('/')
    await page.getByRole('button', { name: /^Filtros/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByRole('checkbox', { name: /^Polygon/ }).check()
    await expect(page).toHaveURL(/chain=polygon/)
    const total = await apiTotal(page, 'chain=polygon')
    await sheet.getByRole('button', { name: /Ver \d+ resultados/ }).click()
    await expect(sheet).toBeHidden()
    expect(await resultsCount(page)).toBe(total)
    await expect(page.getByRole('button', { name: 'Filtros, 1 ativos' })).toBeVisible()
  })

  test('resultado vazio e limpeza de filtros', async ({ app, page }) => {
    await app.open('/?q=nao-existe-xyz')
    await expect(page.getByTestId('empty-state')).toContainText('Nenhum NFT encontrado')
    await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
    await expect(page.getByTestId('results-count')).toHaveText(/60 resultados/)
  })

  test('respostas fora de ordem não sobrescrevem a busca mais recente', async ({ app, page }) => {
    await app.open('/', { scenario: 'out-of-order' })
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await app.openSearch()
    const box = page.getByRole('searchbox', { name: /Buscar NFTs/ })
    
    await box.fill('neon')
    await box.press('Enter')
    await box.fill('golden')
    await box.press('Enter')
    await expect(page).toHaveURL(/q=golden/)
    await page.waitForTimeout(2000) 
    const names = await page.getByTestId('nft-grid').getByTestId('nft-card').locator('h3').allTextContents()
    expect(names.length).toBeGreaterThan(0)
    for (const n of names) expect(n.toLowerCase()).toContain('golden')
  })
})
