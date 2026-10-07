# Estado, cache e sincronização

## Onde cada estado vive

| Estado | Dono | Motivo |
|---|---|---|
| Busca, filtros, ordenação, página, edição selecionada | URL (TanStack Router `validateSearch` + zod) | Sobrevive a refresh, voltar/avançar e compartilhamento. Valores inválidos caem no padrão via `.catch` |
| Dados do servidor | TanStack Query | Cache, deduplicação, cancelamento, retry |
| Rascunho do checkout (carteira, rede, dados do colecionador, tentativa; chave `nft:checkout:v2:`) | `sessionStorage`, por usuário (`src/features/checkout/draft.ts`) | Volta intacto depois de refresh ou de sessão expirada, sem vazar para outro usuário |
| Token e id do carrinho de visitante | `localStorage` (`src/api/session-store.ts`) | Sincronizado entre abas pelo evento `storage` |
| Status da conexão em tempo real | Store externo + `useSyncExternalStore` | Indicador no cabeçalho |

## Chaves de cache (`src/api/query-keys.ts`)

- Públicos: `['nfts', 'list', params]`, `['nfts', 'featured']`, `['nfts', 'detail', id]`
- Privados: `['private', userId, …]`: carrinho, cotação por rede, pedidos, pedido, perfil, carteiras, favoritos
- Visitante: `['guest', cartId, 'cart' | 'quote', …]`
- Sessão: `['session', token]`

Como o `userId` faz parte da chave, um usuário nunca lê o cache de outro, mesmo sem limpeza. Além disso, logout, troca de conta e expiração **removem** tudo sob `['private']` e `['session']`, zeram o filtro de eventos e reabrem o socket com a nova identidade (`src/app/session-effects.tsx`).

## Política de cache e retry

Padrão (`src/app/query-client.ts`):

| Opção | Valor |
|---|---|
| `staleTime` | 30 s (catálogo); destaque 60 s; sessão 60 s; carrinho 10 s; cotação 0 s com refetch a cada 60 s; dados privados 15 s |
| `gcTime` | 5 min |
| `refetchOnWindowFocus` | sim |
| `retry` | Só se `ApiError.retryable` (rede, timeout, 5xx), no máximo 2 novas tentativas. 4xx nunca é repetido. Detalhe do NFT e pedido não repetem 404/403 |
| `retryDelay` | `min(500 · 2^n, 4000)` ms |
| Mutations | Sem retry, **exceto** criação de pedido, que é idempotente |

Pedido `pending`: `refetchInterval` de 5 s como rede de segurança caso o evento de tempo real se perca. Pedidos finais (`confirmed`/`rejected`) têm `staleTime: Infinity` porque são imutáveis.

## Respostas fora de ordem

Cada combinação de filtros tem chave própria e a requisição recebe o `AbortSignal` do Query. Ao mudar o filtro, a consulta anterior é cancelada; se a resposta antiga chegar mesmo assim, ela vai para a chave antiga e não sobrescreve a lista atual. `placeholderData: keepPreviousData` mantém a lista anterior (esmaecida e com `aria-busy`) enquanto a nova chega, sem piscar skeleton. Coberto pelo cenário `out-of-order` e por `tests/e2e/01-catalog.spec.ts`.

Mudar qualquer filtro, a busca ou a ordenação volta para a página 1.

No carrinho, cada resposta traz `version`. Ao gravar a resposta de uma mutação no cache, `useCartWriter` descarta a que tiver versão menor que a já guardada para o mesmo carrinho: um `PATCH` lento que termina depois de um `DELETE` não ressuscita o item removido.

## Atualização otimista com rollback

- **Favoritar** (`src/features/nft/use-favorites.ts`): `onMutate` cancela consultas em andamento, guarda o snapshot e aplica a mudança; `onError` restaura o snapshot, mostra toast e anuncia na região live; `onSettled` revalida.
- **Quantidade no carrinho** (`src/features/cart/use-cart.ts`): mesmo padrão; a cotação é invalidada depois.

## Sessão

- O interceptor do Axios anexa o token. Um `401` com o token atual limpa a sessão com motivo `expired`.
- Os guards das rotas privadas mandam ao login com `redirect` para a rota atual (inclui query string). O destino é validado (`safeRedirect`) para aceitar só caminhos internos.
- O rascunho do checkout continua em `sessionStorage`; após o novo login, o usuário volta ao checkout com os dados preenchidos.
- Ao entrar, o carrinho de visitante é mesclado ao do usuário (`POST /cart/merge`).

## Compra: cotação, revalidação e idempotência

1. O resumo vem de `POST /quotes` (o servidor calcula; o cliente só exibe).
2. Na revisão, o cliente compara a assinatura da cotação (linhas, preços, desconto, taxa, total) com a que o usuário viu. Se mudou, por evento ou por refetch, aparece um alerta com as diferenças e a confirmação exige novo clique.
3. Ao confirmar, a tentativa recebe uma `Idempotency-Key` aleatória, guardada no rascunho junto com a impressão digital do conteúdo (`nextAttempt`). Enquanto o conteúdo for o mesmo, a chave é a mesma; se o usuário mudar algo, nasce outra. Timeout ou erro de rede repetem com **a mesma chave** (até 3 vezes); refresh no meio também reaproveita a chave. O servidor devolve o mesmo pedido.
4. `QUOTE_STALE`: o cliente aplica a cotação nova que veio no erro, invalida carrinho e cotação e pede nova confirmação.
5. O pedido fica `pending` até a simulação responder; a tela do pedido acompanha por evento, com polling de segurança. Não existe "confirmado" sem resposta do servidor.

Um `useIsMutating` impede duplo envio na mesma aba.
