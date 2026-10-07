import { expect, test, USERS } from './fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro com validação e conflito de e-mail', async ({ app, page }) => {
    await app.open('/register')
    const form = page.getByRole('form', { name: 'Formulário de cadastro' })
    const submit = form.getByRole('button', { name: /Criar (conta|perfil)/ })
    await submit.click()
    await expect(form.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await form.getByLabel('Nome de usuário').fill('carla')
    await form.getByLabel('E-mail').fill(USERS.ana.email) // já existe
    await form.getByLabel('Senha', { exact: true }).fill('abc')
    await form.getByLabel('Confirmar senha').fill('abd')
    await submit.click()
    await expect(form.getByText('A senha deve ter pelo menos 8 caracteres')).toBeVisible()
    await expect(form.getByText('As senhas não conferem')).toBeVisible()

    await form.getByLabel('Senha', { exact: true }).fill('Segura123')
    await form.getByLabel('Confirmar senha').fill('Segura123')
    await submit.click()
    await expect(page.getByTestId('register-conflict')).toBeVisible()
    await expect(form.getByText('Este e-mail já está cadastrado.')).toBeVisible()

    await form.getByLabel('E-mail').fill('carla@nft.dev')
    await submit.click()
    await expect(page).toHaveURL('/')
    // Sem nome no cadastro, o nome de exibição começa igual ao usuário.
    await expect(page.getByLabel(/Conta de carla/).locator('visible=true').first()).toBeVisible()
  })

  test('login com erro, sessão recuperada após refresh e logout', async ({ app, page }) => {
    await app.open('/login')
    const form = page.getByRole('form', { name: 'Formulário de login' })
    await form.getByLabel('E-mail', { exact: true }).fill(USERS.ana.email)
    await form.getByLabel('Senha', { exact: true }).fill('errada123')
    await form.getByRole('button', { name: 'Entrar' }).click()
    await expect(form.getByText('E-mail ou senha incorretos.')).toBeVisible()

    await app.loginViaForm('ana')
    await expect(page).toHaveURL('/')
    await page.goto('/account/profile')
    await expect(page.getByTestId('account-user')).toHaveText(USERS.ana.name); await expect(page.getByTestId('account-user')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('account-user')).toHaveText(USERS.ana.name); await expect(page.getByTestId('account-user')).toBeVisible()

    // logout
    await page.getByRole('main').getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL('/')
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fprofile/)
  })

  test('expiração durante a navegação (relógio controlado) preserva o retorno', async ({ app, page }) => {
    await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') })
    await app.open('/')
    await app.loginAs('ana')
    await page.goto('/account/wallets')
    await expect(page.getByTestId('wallet-slot-primary')).toBeVisible()

    // A sessão dura 2h: avança o relógio da página.
    await page.clock.fastForward('02:01:00')
    await page.getByRole('link', { name: 'Dados do perfil' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=.*reason=expired/)
    await expect(page.getByTestId('session-expired-alert')).toBeVisible()
    await app.loginViaForm('ana')
    await expect(page).toHaveURL(/\/account\/profile/)
  })

  test('troca de usuário limpa dados privados do anterior', async ({ app, page }) => {
    await app.open('/')
    await app.loginAs('ana')
    await page.goto('/account/favorites')
    await expect(page.getByTestId('favorites-grid').getByTestId('nft-card')).toHaveCount(2)

    // troca para Bruno sem recarregar a página
    await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'bruno@nft.dev', password: 'Senha@123' }) })
      const { token } = await res.json()
      localStorage.setItem('nft:session-token', token)
      window.dispatchEvent(new StorageEvent('storage', { key: 'nft:session-token', newValue: token }))
    })
    await expect(page.getByTestId('account-user')).toHaveText(USERS.bruno.name); await expect(page.getByTestId('account-user')).toBeVisible()
    await expect(page.getByText('Nenhum favorito ainda')).toBeVisible()
    await page.goto('/account/wallets')
    await expect(page.getByTestId('wallet-slot-primary')).toContainText('Você ainda não adicionou uma carteira principal')
  })
})
