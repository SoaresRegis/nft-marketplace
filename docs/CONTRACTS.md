# Contratos da API

Fonte da verdade: `src/api/contracts.ts`. Cada resposta é validada com zod no cliente (`request(schema, config)` em `src/api/http.ts`); uma resposta fora do contrato vira `ApiError` com código `UNKNOWN` em vez de dados corrompidos na tela. Os handlers do MSW usam os mesmos schemas para validar entradas.

Base: `VITE_API_URL` (padrão `/api`). JSON em todas as rotas.

## Convenções

- **Valores em ETH são strings decimais** (`"0.0825"`, até 18 casas, regex `^\d+(\.\d{1,18})?$`). Toda a aritmética usa `big.js` (`src/lib/money.ts`); nada passa por `number`.
- **Autenticação**: `Authorization: Bearer <token>`. Visitantes carregam o carrinho em `X-Guest-Cart: <id>`.
- **Versões**: NFTs e pedidos têm `version` inteiro, incrementado a cada mudança. É o que permite descartar eventos atrasados.
- **Datas**: ISO 8601 em UTC.

## Erros

```json
{ "error": { "code": "QUOTE_STALE", "message": "…", "fields": { "campo": "mensagem" }, "details": {}, "retryable": false } }
```

| Código | HTTP | Uso |
|---|---|---|
| `VALIDATION_ERROR` | 400/422 | Entrada inválida; `fields` mapeia campo → mensagem (exibida no próprio campo) |
| `UNAUTHENTICATED` / `SESSION_EXPIRED` | 401 | Sem sessão ou sessão vencida. O cliente limpa o token e leva ao login preservando o destino |
| `FORBIDDEN` | 403 | Recurso de outro usuário (ex.: pedido alheio) |
| `NOT_FOUND` | 404 | |
| `INVALID_CREDENTIALS` / `EMAIL_TAKEN` | 401/409 | Login e cadastro |
| `CONFLICT` / `AVAILABILITY_CONFLICT` | 409 | Regra de negócio (carteira não conectada, estoque insuficiente) |
| `COUPON_INVALID` / `COUPON_EXPIRED` | 422 | Cupom |
| `QUOTE_STALE` | 409 | Cotação não corresponde mais ao estado do servidor; `details.quote` traz a cotação nova |
| `IDEMPOTENCY_CONFLICT` | 409 | Mesma `Idempotency-Key` com outro conteúdo |
| `WALLET_REJECTED` | 409 | Carteira recusou a conexão |
| `TRANSIENT_FAILURE` | 503 | Falha temporária (`retryable: true`) |
| `NETWORK_ERROR` / `TIMEOUT` | — | Gerados no cliente (`src/api/errors.ts`), sempre `retryable` |

## Endpoints

### Autenticação
| Método | Rota | Corpo → Resposta |
|---|---|---|
| POST | `/auth/register` | `{ name?, username, email, password }` → `Session` |
| POST | `/auth/login` | `{ email, password }` → `Session { token, user, expiresAt }` |
| GET | `/auth/session` | → `{ user, expiresAt }` |
| POST | `/auth/logout` | → `{ ok }` |

### Catálogo
| Método | Rota | Notas |
|---|---|---|
| GET | `/nfts` | `q`, `view` (`new`, `trending`), `category[]`, `chain[]` (`ethereum`, `polygon`, `solana`), `minPrice`, `maxPrice`, `availability`, `sort` (`recent`, `price-asc`, `price-desc`, `popular`, `name`), `page`, `pageSize` → `{ items, page, pageSize, total, totalPages, facets }`. `facets` traz contagens por coleção e rede (depois de `view` e `q`, antes dos outros filtros) e a faixa de preço do catálogo. Itens em oferta trazem `compareAtPriceEth` |
| GET | `/nfts/featured` | → `{ items: NftDetail[] }` |
| GET | `/nfts/:id` | → `NftDetail` (galeria, edições com preço, disponibilidade e limite por pedido) |

### Newsletter
`POST /newsletter` `{ email }` → 201 `{ email, subscribedAt }`; 409 `CONFLICT` se o e-mail já está inscrito.

### Favoritos (autenticado)
`GET /me/favorites`, `PUT /me/favorites/:nftId`, `DELETE /me/favorites/:nftId` → `{ nftIds }`.

### Carrinho (visitante ou autenticado)
| Método | Rota | Notas |
|---|---|---|
| GET | `/cart` | Itens com `unitPriceEth` atual, `acknowledgedPriceEth`, `priceChanged`, `available`, `exceedsAvailability` |
| POST | `/cart/items` | `{ nftId, editionId, quantity }`; soma se o item já existe, respeitando estoque e `maxPerOrder` |
| PATCH | `/cart/items/:id` | `{ quantity }` |
| DELETE | `/cart/items/:id` | |
| POST | `/cart/acknowledge` | Aceita os preços/estoques atuais |
| PUT / DELETE | `/cart/coupon` | `{ code }` |
| POST | `/cart/merge` | `{ guestCartId }`, chamado após login |

### Cotação e pedidos
| Método | Rota | Notas |
|---|---|---|
| POST | `/quotes` | `{ network }` → `Quote` (linhas, subtotal, desconto, taxa de rede, total, `issues`, `valid`, `expiresAt`). Visitantes também cotam |
| POST | `/orders` | Header `Idempotency-Key` (obrigatório). `{ quoteId, walletId, network, collector }` → `201 Order` (`status: pending`). `collector`: `fullName`, `username`, `profileName`, `email`, `ensName?`, `referralCode?`, `note?` (até 500); o pedido guarda um snapshot `{ fullName, username, profileName, email, note }` |
| GET | `/orders` | Pedidos do usuário |
| GET | `/orders/:id` | `403` se o pedido for de outro usuário |

Regras de `POST /orders`:
1. Mesma chave + mesmo corpo → devolve o mesmo pedido (`200`, header `Idempotent-Replayed: true`). Nunca cria um segundo.
2. Mesma chave + corpo diferente → `409 IDEMPOTENCY_CONFLICT`.
3. A cotação é recalculada no servidor; se preço, estoque, cupom ou taxa mudaram → `409 QUOTE_STALE` com a cotação nova. O cliente mostra o que mudou e exige nova confirmação.
4. A carteira precisa estar conectada na rede escolhida.
5. O pedido nasce `pending` e só passa a `confirmed` ou `rejected` pela simulação de liquidação; estados finais são imutáveis. O recibo é um snapshot do pedido.

Taxas de rede: Ethereum `0.0021 + 0.00035/unidade`, Polygon `0.00012 + 0.00002/unidade`, Solana `0.00045 + 0.00008/unidade`.

### Conta (autenticado)
| Método | Rota |
|---|---|
| GET / PATCH | `/me/profile` (`name`, `username`, `email`, `ensName` opcional, `walletNickname`) |
| PUT / DELETE | `/me/avatar` (`{ dataUrl }`, imagem até 1 MB) |
| POST | `/me/password` (`{ currentPassword, newPassword }`) |
| GET / POST | `/me/wallets` |
| PUT | `/me/wallets/:id` (`label`, `provider`, `address`, `role: primary|secondary`, `networks`, `displayName`, `profileName`, `email`, `ensName?`, `referralCode?`, `secondaryAddress?` endereço 0x ou `nome.eth`) |
| POST | `/me/wallets/:id/connect` (`{ network }`), `/me/wallets/:id/disconnect` |

### Campos adicionados com as telas do Figma
- `GET /nfts/:id` traz também `tokenId`, `collection`, `attributes[]` (`{ trait, value }`), `royaltyPercent`, `rating` (`{ average, count }`) e `reviews[]` (`{ id, author, rating 1–5, createdAt, text }`, até 6).
- Itens do carrinho e linhas da cotação/pedido levam `tokenId`.
- `POST /auth/register` aceita `name` opcional (sem ele, o nome de exibição começa igual ao usuário).
- Rotas de conta no app: `/account/profile`, `/account/wallets`, `/account/activity` (pedidos), `/account/favorites`, `/account/offers`, `/account/downloads`, `/account/support`.

## Eventos de tempo real

Envelope comum:

```ts
{ eventId: string, type: 'nft.updated' | 'order.updated', resource: { type, id }, version: number, occurredAt: string, data }
```

- `nft.updated`, público: `{ nftId, name, priceEth, available, editions[], changes: ('price'|'availability')[] }`
- `order.updated`, só para o dono: `{ orderId, userId, status, transaction, failureReason }`

Comportamento do cliente em [REALTIME.md](REALTIME.md).
