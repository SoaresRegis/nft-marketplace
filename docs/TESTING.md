# Testes

## Como rodar

```bash
pnpm test:e2e                       # builda o modo demo, sobe o preview e roda tudo
E2E_BASE_URL=http://localhost:4173 pnpm test:e2e   # reaproveita um servidor já rodando
npx playwright test tests/e2e/06-purchase.spec.ts --project=mobile
npx playwright show-report          # relatório HTML
pnpm test:e2e:update                # regera as referências visuais
```

Projetos: **desktop** (1440 × 900) e **mobile** (Pixel 7, 390 × 844). Com `E2E_ALL_BROWSERS=1` entram também **firefox**, **webkit** (Safari) e **mobile-safari** (iPhone 13), sem a regressão visual (as referências são do Chromium); antes, instale os navegadores com `pnpm exec playwright install firefox webkit`. Quando um teste falha, o trace e o screenshot ficam em `test-results/` e aparecem no relatório HTML.

Os testes rodam contra o **build de produção** (`vite build --mode demo`), não contra o servidor de desenvolvimento.

## Isolamento e determinismo

Cada teste roda num contexto de navegador novo, então o banco simulado (em `localStorage`) começa sempre do estado inicial gerado com semente fixa. O cenário é escolhido por `?mock=` ou pela API de controle (`MockControl` em `tests/e2e/fixtures.ts`). Os testes aguardam estados visíveis da UI ou respostas da rede; as poucas pausas fixas existem só para provar que algo **não** muda (uma resposta antiga ou um evento duplicado chegando depois). Na expiração de sessão o relógio é controlado com `page.clock`.

Os eventos de tempo real são provocados **pelo lado do servidor simulado** (`/__mock/nfts/:id`, `/__mock/events/*`, `/__mock/socket/*`), nunca injetados na UI.

## Cobertura

| Spec | O que garante |
|---|---|
| `01-catalog` | Busca, filtros combinados, ordenação e paginação refletidos na URL, voltar/avançar e refresh; filtro reseta a página; drawer de filtros no mobile; estado vazio e limpeza; respostas fora de ordem não sobrescrevem a busca atual |
| `02-detail` | Acesso direto, galeria, troca de edição na URL, limite de quantidade, edição indisponível ou esgotada, NFT e rota inexistentes |
| `03-auth` | Cadastro com validação e e-mail em uso; login com erro; sessão recuperada após refresh; logout; expiração preserva o destino; troca de usuário não mostra dados do anterior |
| `04-favorites` | Visitante vai ao login e volta; favorito persiste; falha da mutation faz rollback e a nova tentativa funciona |
| `05-cart` | Quantidades e limite, remoção, cupons válido/inválido/expirado, persistência após refresh e login; rollback do otimismo quando o servidor recusa |
| `06-purchase` | Fluxo completo do catálogo ao recibo, com o carrinho do visitante preservado no login, cadastro da primeira carteira e o pedido confirmado pelo evento |
| `07-payment-failures` | Pagamento recusado mantém o carrinho; cliques repetidos geram um só pedido; timeout recupera o mesmo pedido pela chave; mesma chave com outro corpo gera `409` |
| `08-account` | Perfil do colecionador com validação, conflito e persistência; avatar (envio, formato, remoção); troca de senha; carteiras principal e secundária nos formulários da página |
| `09-realtime-checkout` | Preço muda durante a revisão (aviso, resumo atualizado, nova confirmação); sem o evento, o servidor recusa a cotação velha; edição esgota e bloqueia; catálogo e detalhe atualizam sem recarregar |
| `10-realtime-resilience` | Duplicatas e eventos antigos não regridem o estado; reconciliação via REST após queda; pedido pendente sobrevive à queda e ao refresh sem nova compra; evento de outro usuário é ignorado |
| `11-a11y-keyboard` | Skip link e foco visível; adicionar ao carrinho só com teclado; diálogo prende e devolve o foco; no mobile, painel de filtros com foco preso e navegação pela barra inferior; erros associados aos campos; sem overflow horizontal em 390, 768 e 1440 |
| `12-loading-errors` | Skeletons em rede lenta; erro com nova tentativa que recupera; retry automático de falha transitória; offline |
| `13-visual` | Regressão visual de início, detalhe, carrinho e pagamento (revisão) em desktop e mobile |

Resultado na última execução (2026-10-07, Chromium): **92 aprovados, 4 ignorados de propósito** (testes exclusivos de um dos projetos).

## Regressão visual

`toHaveScreenshot` com `maxDiffPixelRatio: 0.01`, animações desativadas e cursor oculto. Antes da captura, o teste espera fontes e imagens carregarem. As referências ficam em `tests/e2e/__screenshots__/` e foram geradas no Chromium do Playwright 1.56 em Linux; em outro sistema, gere novas referências com `pnpm test:e2e:update`.
