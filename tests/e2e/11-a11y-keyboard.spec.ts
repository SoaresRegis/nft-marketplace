import { expect, test } from './fixtures'

test.describe('Acessibilidade e teclado', () => {
  test('link de pular conteúdo e foco visível', async ({ app, page }) => {
    await app.open('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
   
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!)
      return { outline: s.outlineStyle, ring: s.boxShadow }
    })
    expect(style.outline !== 'none' || style.ring !== 'none').toBe(true)
  })

  test('adiciona ao carrinho só com teclado', async ({ app, page }) => {
    await app.open('/nft/nft-02')
    const add = page.getByTestId('add-to-cart')
    for (let i = 0; i < 40 && !(await add.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(add).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('live-polite')).toContainText('adicionado ao carrinho')
  })

  test('diálogo prende o foco, fecha com Esc e devolve o foco', async ({ app, page }) => {
    await app.open('/')
    const trigger = page.getByRole('button', { name: /Ler mais.*Como funciona a propriedade/ })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Como funciona a propriedade de NFTs' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('mobile: filtros abrem em painel com foco preso e as abas inferiores navegam', async ({ app, page }) => {
    test.skip(!app.isMobile(), 'somente mobile')
    await app.open('/')
    const trigger = page.getByTestId('mobile-filters')
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()

    const tabs = page.getByRole('navigation', { name: 'Navegação inferior' })
    await expect(tabs.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    await tabs.getByRole('button', { name: 'Buscar NFTs' }).click()
    const search = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await search.getByRole('searchbox').fill('Ape')
    await search.getByRole('searchbox').press('Enter')
    await expect(page).toHaveURL(/q=Ape/)
    await tabs.getByRole('link', { name: /Carrinho/ }).click()
    await expect(page).toHaveURL('/cart')
    await expect(page.getByRole('heading', { level: 1, name: 'Carrinho de NFTs' })).toBeVisible()
  })

  test('erros de formulário associados aos campos e foco no primeiro inválido', async ({ app, page }) => {
    await app.open('/login')
    const form = page.getByRole('form', { name: 'Formulário de login' })
    await form.getByRole('button', { name: 'Entrar' }).click()
    const email = form.getByLabel('E-mail', { exact: true })
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = (await email.getAttribute('aria-describedby'))!.split(' ')
    const messageId = describedBy.find((id) => id.endsWith('message'))!
    await expect(page.locator(`[id="${messageId}"]`)).toHaveText(/Informe o e-mail/)
  })

  test('sem overflow horizontal na página inicial e no checkout', async ({ app, page }) => {
    await app.open('/')
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(await overflow()).toBeLessThanOrEqual(0)
    
    await app.open('/?chain=polygon&category=music')
    await expect(page.getByTestId('nft-grid')).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
    await app.loginAs('ana')
    await app.addToCart('nft-01')
    await page.goto('/cart')
    expect(await overflow()).toBeLessThanOrEqual(0)
  })

  test('tablet (768px): sem overflow horizontal nas telas principais', async ({ app, page }) => {
    test.skip(app.isMobile(), 'roda uma vez, no projeto desktop')
    await page.setViewportSize({ width: 768, height: 1024 })
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    await app.open('/')
    await app.loginAs('ana')
    await app.addToCart('nft-01')
    for (const path of ['/', '/nft/nft-01', '/cart', '/checkout', '/account/profile', '/account/wallets']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      expect(await overflow(), path).toBeLessThanOrEqual(0)
    }
  })
})
