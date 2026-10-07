# Kurio, marketplace de NFTs

Marketplace de NFTs em React + TypeScript, responsivo (desktop e mobile): catálogo com busca, filtros e ordenação na URL, detalhe com edições e favoritos, carrinho com cupom, pagamento com carteira e rede, pedido idempotente acompanhado em tempo real, recibo, autenticação, perfil e carteiras.

Não há backend real nem serviço privado. A API REST e o servidor Socket.IO são simulados no navegador pelo **MSW** (com `@mswjs/socket.io-binding`), com regras de negócio, persistência e cenários de falha. A aplicação fala com eles como falaria com um servidor: Axios para REST e `socket.io-client` para tempo real. Tudo roda a partir de um checkout limpo.

Arquitetura, contratos, sessão, carrinho, cache, reconciliação REST × Socket.IO, decisões de UX e desvios do Figma: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

# Projeto no ar
https://nft-marketplace-nine-tau.vercel.app/

## Setup

Requisitos: **Node 20+** e **pnpm 9+** (`corepack enable` instala o pnpm da versão certa).

```bash
git clone <repo> && cd nft-marketplace
pnpm install
pnpm dev                       # http://localhost:5173, mocks ativos
```

Para os testes E2E, o Playwright usa o Chromium que ele mesmo baixa: `pnpm exec playwright install chromium` (uma vez).

## Variáveis de ambiente

Os arquivos versionados já trazem valores que funcionam; nenhuma variável é secreta.

| Variável            | Padrão                                 | Para que serve                                                                                                   |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true`                                 | Liga a camada MSW (REST + Socket.IO simulados). Com `false` a app tenta falar com uma API real em `VITE_API_URL` |
| `VITE_API_URL`      | `/api`                                 | Base da API REST                                                                                                 |
| `VITE_SOCKET_URL`   | `wss://realtime.nft-marketplace.local` | Servidor Socket.IO. Com mocks, o MSW intercepta esse endereço e nenhuma conexão sai do navegador                 |

| Arquivo            | Usado por                                                                    |
| ------------------ | ---------------------------------------------------------------------------- |
| `.env.development` | `pnpm dev`                                                                   |
| `.env.demo`        | `pnpm build:demo` (testes, Lighthouse, demonstração)                         |
| `.env.example`     | Modelo comentado. Copie para `.env.local` (não versionado) para sobrescrever |

## Credenciais fictícias

| E-mail          | Senha       | Perfil                                                                 |
| --------------- | ----------- | ---------------------------------------------------------------------- |
| `ana@nft.dev`   | `Senha@123` | Tem 2 carteiras (principal e secundária) e 2 favoritos                 |
| `bruno@nft.dev` | `Senha@123` | Sem carteiras nem favoritos (bom para o fluxo de cadastro de carteira) |

As senhas existem no banco simulado só como hash `sha256(salt:senha)`; nada é guardado em claro. Cada recurso privado é filtrado pelo usuário da sessão.

Cupons: `NFT10` (10%), `WELCOME` (0,01 ETH), `GASFREE` (zera a taxa de rede), `VIP20` (20% acima de 1 ETH), `BLACK50` (expirado, para ver o erro).

## Comandos

| Comando                            | O que faz                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                         | Desenvolvimento com mocks (`:5173`)                                                                                                                     |
| `pnpm build`                       | Typecheck + build de produção (sem mocks, espera uma API real)                                                                                          |
| `pnpm build:demo`                  | Typecheck + build com mocks embutidos                                                                                                                   |
| `pnpm preview`                     | Serve o build em `:4173`                                                                                                                                |
| `pnpm typecheck`                   | `tsc -b`                                                                                                                                                |
| `pnpm lint`                        | ESLint (TypeScript, regras de hooks), sem avisos permitidos                                                                                             |
| `pnpm test:e2e`                    | Playwright em desktop 1440 e mobile 390 (Chromium). Sobe `build:demo` + `preview` sozinho                                                               |
| `E2E_ALL_BROWSERS=1 pnpm test:e2e` | Inclui Firefox, WebKit (Safari) e iPhone 13. Antes: `pnpm exec playwright install firefox webkit`                                                       |
| `pnpm test:e2e:update`             | Regera as referências da regressão visual                                                                                                               |
| `pnpm lighthouse`                  | 3 auditorias por página e perfil (mobile e desktop), mediana, relatórios em `lighthouse/reports/`. Precisa do `pnpm build:demo && pnpm preview` rodando |

Relatório do Playwright: `pnpm exec playwright show-report`. Traces de falhas ficam em `test-results/`.

## Deploy na Vercel

O deploy publica o **build de demonstração** (mocks embutidos), porque não existe backend: a API e o Socket.IO continuam simulados no navegador de cada visitante, com os dados guardados no `localStorage` dele. O `vercel.json` já define tudo:

| Configuração           | Valor                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework              | Vite                                                                                                          |
| Install                | `pnpm install --frozen-lockfile`                                                                              |
| Build                  | `pnpm build:demo`                                                                                             |
| Saída                  | `dist`                                                                                                        |
| Rotas                  | Qualquer caminho que não seja arquivo estático volta para `index.html` (o TanStack Router resolve no cliente) |
| `mockServiceWorker.js` | Servido sem cache, para o MSW nunca ficar preso numa versão antiga                                            |

Não é preciso configurar variáveis de ambiente na Vercel: `.env.demo` é versionado e já traz os valores. Para conferir antes, `pnpm build:demo && pnpm preview` reproduz o que vai ao ar.

## Cenários: seleção e reset

| Como                     | Exemplo                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| URL                      | `http://localhost:5173/?mock=slow` aplica o cenário (persiste até trocar)                                                                                                                                                |
| Reset pela URL           | `?mock-reset` restaura banco, cenário e socket ao estado inicial                                                                                                                                                         |
| Painel                   | Botão **Cenários** (canto inferior esquerdo) no dev e no build de demonstração: troca o cenário, muda preço ou esgota o item do carrinho, reenvia o último evento, derruba o socket, expira a sessão e restaura os dados |
| HTTP (da própria página) | `fetch('/__mock/scenario', { method: 'PUT', body: JSON.stringify({ preset: 'slow' }) })` e `POST /__mock/reset`                                                                                                          |

Cenários: `default`, `empty`, `slow`, `variable-latency`, `out-of-order`, `offline`, `server-error`, `flaky`, `session-short`, `payment-rejected`, `payment-manual`, `order-timeout`, `price-change`, `sold-out`, `wallet-reject`. Descrição de cada um em [docs/MOCKS.md](docs/MOCKS.md).

## Reproduzindo os fluxos de falha

Entre como Ana, adicione um NFT ao carrinho e siga:

| Fluxo                            | Como reproduzir                                                                                                       | O que esperar                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pagamento recusado               | `?mock=payment-rejected`, depois Pagamento → Confirmar compra                                                         | Pedido recusado, botão para tentar de novo, itens continuam no carrinho                                                   |
| Pedido pendente                  | `?mock=payment-manual` e confirmar                                                                                    | Tela de pedido em processamento; ao recarregar continua pendente. Liquide pelo painel ou `POST /__mock/orders/:id/settle` |
| Timeout + idempotência           | `?mock=order-timeout` e confirmar                                                                                     | "Verificando o mesmo pedido…": a nova tentativa usa a mesma `Idempotency-Key` e só existe um pedido                       |
| Duplo clique                     | `?mock=slow` e clicar várias vezes em Confirmar                                                                       | Um único pedido                                                                                                           |
| Preço muda no checkout           | Painel → "Alterar preço do 1º item do carrinho" (ou `?mock=price-change`) com o pagamento aberto                      | Toast e alerta com a diferença; confirmar exige aceitar os novos valores                                                  |
| Item esgota                      | Painel → "Esgotar 1º item do carrinho" (ou `?mock=sold-out`)                                                          | Confirmar fica bloqueado; carrinho marca o item como esgotado                                                             |
| Cotação desatualizada sem evento | No console da página: `fetch('/__mock/socket/block', { method: 'POST' })`, depois mude o preço pelo painel e confirme | Servidor responde `409 QUOTE_STALE`; a UI mostra a nova cotação e pede confirmação                                        |
| Carteira recusa                  | `?mock=wallet-reject` e confirmar                                                                                     | Alerta "Conexão não concluída"; o formulário é mantido                                                                    |
| Sessão expira                    | Painel → "Expirar sessão agora" (ou `?mock=session-short`, 20 s)                                                      | Ao navegar, vai ao login com aviso; depois de entrar volta à mesma tela, com carrinho e rascunho do pagamento             |
| Queda do tempo real              | Painel → "Derrubar conexão do socket" (ou `POST /__mock/socket/block` e depois `unblock`)                             | Indicador "Reconectando"; ao voltar, os dados são reconciliados pela API REST                                             |
| Evento duplicado ou antigo       | Painel → "Reenviar último evento (duplicata)"                                                                         | Ignorado (não regride preço nem estado)                                                                                   |
| API fora / offline               | `?mock=server-error` ou `?mock=offline`                                                                               | Estados de erro com "Tentar novamente"; `?mock=flaky` mostra o retry automático                                           |
| Respostas fora de ordem          | `?mock=out-of-order` e trocar filtros rápido                                                                          | A lista sempre corresponde ao último filtro                                                                               |
| Validação e conflito             | Cadastro com `ana@nft.dev`; perfil com usuário `ana`; carteira com `0x000000000000000000000000000000000000dEaD`       | Erros do servidor aparecem no campo certo                                                                                 |

Todos esses fluxos têm teste automatizado em `tests/e2e/` ([docs/TESTING.md](docs/TESTING.md)).

## Estrutura

```
src/
  api/          contratos (zod), cliente HTTP, endpoints, chaves de cache, sessão
  app/          bootstrap, roteador, layout raiz, efeitos de sessão
  features/     catalog, nft, cart, checkout, orders, auth, account
  realtime/     cliente Socket.IO, filtro de eventos, sincronização com o cache
  components/   ui (shadcn), layout (cabeçalho, rodapé, barras mobile), estados comuns
  lib/          dinheiro (big.js), media queries, utilitários
  mocks/        banco, cenários, handlers REST, servidor Socket.IO, painel
tests/e2e/      specs Playwright, fixtures e referências visuais
lighthouse/     configuração e relatórios
design/figma/   referências do Figma (desktop em PNG, mobile em SVG)
docs/           detalhes por assunto
```

## Documentação

- [ARCHITECTURE.md](ARCHITECTURE.md): visão geral, decisões, limitações e desvios do Figma
- [docs/CONTRACTS.md](docs/CONTRACTS.md): endpoints, payloads, erros e eventos
- [docs/STATE.md](docs/STATE.md): cache, retry, otimismo, sessão, idempotência
- [docs/REALTIME.md](docs/REALTIME.md): transporte, duplicatas, reconexão, isolamento
- [docs/MOCKS.md](docs/MOCKS.md): cenários, endpoints de controle, persistência
- [docs/DESIGN.md](docs/DESIGN.md): tokens, telas do Figma, responsividade, acessibilidade
- [docs/TESTING.md](docs/TESTING.md): cobertura E2E e regressão visual
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md): resultados do Lighthouse
