# Camada de mocks (MSW)

Ligada por `VITE_ENABLE_MOCKS=true` (`.env` e `.env.demo`). Funciona em `pnpm dev`, no build de demonstração e nos testes. O service worker do MSW fica em `public/mockServiceWorker.js`.

## Peças

| Arquivo | Papel |
|---|---|
| `src/mocks/db.ts` | Banco em memória com regras de negócio (preços, estoque, cupons, cotação, sessões, pedidos), persistido em `localStorage` (`nft-mock:db:v3`) |
| `src/mocks/fixtures/*` | 60 NFTs, 2 usuários, cupons. Gerados com semente fixa |
| `src/mocks/scenarios.ts` | Presets e configuração de cenário, persistida em `nft-mock:scenario:v1` |
| `src/mocks/network.ts` | Latência, fora de ordem, offline e falhas por regra |
| `src/mocks/handlers/*` | Handlers REST (auth, nfts, favoritos, carrinho, pedidos, conta, controle) |
| `src/mocks/realtime.ts` | Servidor Socket.IO simulado ([REALTIME.md](REALTIME.md)) |
| `src/mocks/mutations.ts` | Mudanças de preço/estoque e liquidação de pedidos, que geram os eventos |
| `src/mocks/panel/mock-panel.tsx` | Painel "Cenários" |

As senhas são guardadas como `sha256(salt:senha)`. Sessões têm validade (2 h no padrão) e cada recurso privado é filtrado pelo usuário da sessão.

## Determinismo

Os dados vêm de um gerador com semente fixa (`seed: 42`), as latências são fixas no padrão (150 ms) e as variáveis usam o mesmo gerador. Mesmo cenário + mesmo reset = mesmo resultado, o que mantém os testes estáveis.

## Cenários

| Preset | Efeito |
|---|---|
| `default` | Tudo funciona; pagamento confirma em ~2 s |
| `empty` | Catálogo vazio |
| `slow` | 2,5 s em toda requisição REST (skeletons) |
| `variable-latency` | 300 ms ± 1,2 s |
| `out-of-order` | Listagens respondem fora de ordem (a mais antiga chega por último) |
| `offline` | REST falha como erro de rede e o socket é recusado |
| `server-error` | 503 em todas as rotas `/api` |
| `flaky` | 503 uma vez no catálogo, depois normal (testa retry) |
| `session-short` | Sessão de 20 s |
| `payment-rejected` | Pagamento recusado após 1,5 s |
| `payment-manual` | Pedido fica pendente até ser liquidado pelo controle |
| `order-timeout` | Cria o pedido, mas a primeira resposta chega depois do timeout do cliente (6 s) |
| `price-change` | Depois da primeira cotação, o preço do primeiro item muda |
| `sold-out` | Depois da primeira cotação, o primeiro item esgota |
| `wallet-reject` | A carteira recusa a conexão |

### Como escolher

- **URL**: `?mock=slow` na carga da página (persiste até trocar). `?mock-reset` restaura os dados iniciais.
- **Painel**: botão "Cenários" no canto inferior, disponível no build de demonstração. Troca o preset, dispara mudança de preço ou esgota uma edição do primeiro item do carrinho, reenvia o último evento (duplicata), derruba o socket, expira a sessão e restaura os dados iniciais.
- **HTTP** (a partir da página, pois o service worker intercepta): `PUT /__mock/scenario`.

## Endpoints de controle

Só existem na camada de mocks. Os testes usam pela fixture `MockControl` (`tests/e2e/fixtures.ts`).

| Método | Rota | Corpo | Efeito |
|---|---|---|---|
| GET | `/__mock/state` | | Cenário atual e contagens |
| POST | `/__mock/reset` | `{ preset?, overrides? }` | Recria o banco, o cenário, a rede e o socket |
| PUT | `/__mock/scenario` | `{ preset?, overrides? }` | Troca o cenário mantendo os dados |
| POST | `/__mock/nfts/:id` | `{ editionId?, priceEth?, available? }` | Muda preço/estoque e emite `nft.updated` |
| POST | `/__mock/session/expire` | | Expira todas as sessões |
| POST | `/__mock/socket/drop` · `block` · `unblock` | | Derruba conexões, recusa novas, volta a aceitar |
| GET | `/__mock/events` | | Log dos eventos emitidos |
| POST | `/__mock/events/replay` | `{ type? }` | Reenvia o último evento (mesmo `eventId` e versão) |
| POST | `/__mock/events/stale` | `{ nftId }` | Envia um `nft.updated` com versão antiga e dados divergentes |
| POST | `/__mock/orders/:id/settle` | `{ outcome }` | Confirma ou recusa um pedido pendente |
| GET | `/__mock/orders/latest` | | Último pedido criado (para testes) |

`overrides` aceita qualquer campo de `ScenarioConfig` (latência, falhas por regra com `path`/`status`/`times`, duração da sessão, resultado do pagamento etc.).

## Persistência e reset

Banco e cenário ficam em `localStorage` (chave `nft-mock:db:v3`; a versão sobe quando o formato muda, e dados salvos na versão anterior são ignorados). Assim refresh e novas abas veem o mesmo estado (inclusive pedidos pendentes). A liquidação é calculada pelo horário (`settleAt`) quando o banco é lido, então um pedido que venceu enquanto a aba estava fechada é resolvido na volta. Para começar do zero: `?mock-reset`, o botão do painel ou `POST /__mock/reset`.
