# Arquitetura

Visão geral das decisões. Os detalhes de cada assunto estão em `docs/` e são linkados em cada seção.

## Camadas

```
UI (React, rotas TanStack Router, componentes shadcn/Radix + Tailwind)
  │  lê e escreve só pelo cache
TanStack Query (cache por recurso e por usuário)  ◄── realtime/sync.ts ◄── socket.io-client
  │  queryFn / mutationFn                                   ▲
api/endpoints.ts → api/http.ts (Axios) ──── REST ────┐      │ Socket.IO
                                                     ▼      │
                 MSW (service worker): handlers REST + servidor Socket.IO simulado
                 banco em localStorage, cenários, endpoints de controle /__mock/*
```

- **Contratos primeiro**: `src/api/contracts.ts` define em zod cada payload REST e cada evento. As respostas são validadas no cliente, e os handlers simulados usam os mesmos schemas para validar o que recebem. Uma API real só precisa cumprir esse arquivo.
- **Estado de servidor só no TanStack Query**. Eventos de tempo real nunca mexem na UI diretamente: atualizam ou invalidam o cache.
- **URL como estado** do catálogo (busca, filtros, ordenação, página) e da edição escolhida no detalhe, validada com zod em `validateSearch`.

## Contratos REST e eventos

Resumo; a tabela completa, com corpos, códigos de erro e regras, está em [docs/CONTRACTS.md](docs/CONTRACTS.md).

| Grupo        | Rotas                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação | `POST /auth/login`, `POST /auth/register`, `GET /auth/session`, `POST /auth/logout`                                                                                  |
| Catálogo     | `GET /nfts` (busca, filtros, ordenação, paginação, facetas), `GET /nfts/featured`, `GET /nfts/:id`                                                                   |
| Favoritos    | `GET /me/favorites`, `PUT/DELETE /me/favorites/:nftId`                                                                                                               |
| Carrinho     | `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:id`, `POST /cart/acknowledge`, `PUT/DELETE /cart/coupon`, `POST /cart/merge`                             |
| Compra       | `POST /quotes` (cotação calculada no servidor), `POST /orders` com `Idempotency-Key`, `GET /orders`, `GET /orders/:id`                                               |
| Conta        | `GET/PATCH /me/profile`, `PUT/DELETE /me/avatar`, `POST /me/password`, `GET/POST /me/wallets`, `PUT /me/wallets/:id`, `POST /me/wallets/:id/connect` e `/disconnect` |

Erros têm sempre o formato `{ error: { code, message, fields?, details?, retryable? } }`. `fields` liga o erro ao campo do formulário (`applyServerErrors`).

Eventos Socket.IO, com envelope `{ eventId, type, version, occurredAt, data }`:

| Evento          | Quando                                                     | Destino                          |
| --------------- | ---------------------------------------------------------- | -------------------------------- |
| `nft.updated`   | Preço, disponibilidade ou edições mudam                    | Todas as conexões                |
| `order.updated` | Pedido muda de estado (`pending` → `confirmed`/`rejected`) | Só as conexões do dono do pedido |

## Política de sessão

- `POST /auth/login` devolve um token opaco com validade de **2 h** (20 s no cenário `session-short`). Ele fica em `localStorage` e é sincronizado entre abas pelo evento `storage`.
- O interceptor do Axios anexa `Authorization: Bearer`. Um `401` para o token atual encerra a sessão com motivo `expired`.
- As rotas privadas (`/checkout`, `/orders`, `/account/*`) têm guard: sem sessão, vão para `/login?redirect=<rota atual>`; com sessão expirada, também com `reason=expired` e um aviso. O destino passa por `safeRedirect`, que aceita só caminhos internos.
- Logout, troca de conta e expiração removem todo o cache privado, zeram o filtro de eventos e reabrem o socket com a nova identidade (`src/app/session-effects.tsx`). O carrinho de visitante é mesclado ao do usuário no login.
- O rascunho do pagamento fica em `sessionStorage`, com chave por usuário, e sobrevive à expiração: depois de entrar de novo, o usuário volta com os dados preenchidos.
- Senhas existem no banco simulado só como `sha256(salt:senha)`, e todo recurso privado é filtrado pelo usuário da sessão no servidor simulado.

## Estado do carrinho

- O carrinho é **do servidor**. Visitantes recebem um `cartId` (guardado em `localStorage`); usuários têm um carrinho próprio, e o de visitante é mesclado no login.
- Cada item guarda o preço que o usuário viu (`acknowledgedPriceEth`). Quando o preço ou a disponibilidade mudam, o item vem com `priceChanged`/`exceedsAvailability` e a UI pede para aceitar os novos valores (`POST /cart/acknowledge`). Itens esgotados bloqueiam o pagamento.
- Quantidade usa atualização otimista com rollback. As respostas trazem `version`; uma resposta mais antiga que chegue depois (por exemplo, um `PATCH` lento depois de um `DELETE`) não sobrescreve o carrinho mais novo.
- Totais nunca são somados no cliente para cobrar: o resumo vem de `POST /quotes`, recalculado no servidor ao criar o pedido. Valores em ETH usam `big.js` (sem erro de ponto flutuante).

## Estratégia de cache

Detalhes em [docs/STATE.md](docs/STATE.md).

| Dado                         | Chave                                                    | `staleTime` | Observações                                               |
| ---------------------------- | -------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| Catálogo                     | `['nfts','list',params]`                                 | 30 s        | `keepPreviousData`, requisição cancelada ao trocar filtro |
| Detalhe                      | `['nfts','detail',id]`                                   | 30 s        | Atualizado por `nft.updated`                              |
| Carrinho                     | `['private',userId,'cart']` ou `['guest',cartId,'cart']` | 10 s        | Escrito pelas respostas das mutations                     |
| Cotação                      | `[…,'quote',rede]`                                       | 0           | Refetch a cada 60 s e após qualquer mudança no carrinho   |
| Pedido pendente              | `['private',userId,'order',id]`                          | 0           | Polling de 5 s como rede de segurança                     |
| Pedido final                 | idem                                                     | `Infinity`  | Imutável                                                  |
| Perfil, carteiras, favoritos | `['private',userId,…]`                                   | 15 s        | Favoritos com otimismo e rollback                         |

O `userId` faz parte das chaves privadas, então um usuário nunca lê o cache de outro. Retry só para falhas transitórias (rede, timeout, 5xx), com backoff. Mutations não repetem, exceto a criação de pedido, que é idempotente.

## Reconciliação entre REST e Socket.IO

Detalhes em [docs/REALTIME.md](docs/REALTIME.md).

1. **REST**; eventos são atalhos para atualizar mais cedo.
2. Cada recurso tem `version`. O `EventGate` aplica um evento só se o `eventId` for inédito **e** a versão for maior que a já conhecida, inclusive a que veio do REST. Duplicatas e eventos atrasados são descartados.
3. Ao reconectar, o cliente não tenta reproduzir o que perdeu: invalida catálogo ativo, carrinho, cotação e pedidos, e busca tudo de novo via REST.
4. Pedidos pendentes também têm polling, então um pedido confirmado durante uma queda aparece mesmo sem evento.
5. No pagamento, a assinatura da cotação vista pelo usuário é comparada com a atual. Se mudou (por evento ou refetch), a confirmação exige novo aceite. Se o evento se perdeu, o servidor recusa com `409 QUOTE_STALE` e devolve a cotação nova.
6. A criação do pedido usa `Idempotency-Key` estável por conteúdo: timeout, queda ou refresh repetem a mesma chave e recebem o mesmo pedido; mesma chave com corpo diferente dá `409 IDEMPOTENCY_CONFLICT`.

## Responsividade e navegadores

- Breakpoint principal em **768 px**. Abaixo dele vale o layout mobile do Figma (frame de 414 px); acima, o desktop (frame de 1440 px), com adaptações em tablet. Verificado sem rolagem horizontal em 390, 414, 768 e 1440 px.
- Mudanças só visuais usam variantes do Tailwind (`max-md:`). Onde a estrutura muda (detalhe, carrinho, pagamento, login), um `useIsMobile` com `matchMedia` escolhe a árvore, para não duplicar conteúdo nem ids no DOM.
- Barras fixas no rodapé do mobile publicam a própria altura em `--bottom-bar`; conteúdo, toasts e avisos flutuantes usam esse valor para não ficarem escondidos. `env(safe-area-inset-bottom)` com `viewport-fit=cover` cobre iPhones com recorte.
- Navegadores-alvo: as duas últimas versões de Chrome, Edge, Firefox e Safari (Tailwind 4 pede Safari 16.4+, Chrome 111+, Firefox 128+). Os testes rodam no Chromium por padrão e em Firefox, WebKit e iPhone 13 com `E2E_ALL_BROWSERS=1`.

## Decisões de UX

- **Entrar e Criar conta** são um modal sobre a Início no desktop (como no Figma) e uma tela cheia no mobile. As rotas `/login` e `/register` existem, então links, redirecionamentos e o voltar do navegador funcionam.
- **Pagamento em uma tela**. "Confirmar compra" valida os dados, conecta a carteira simulada na rede escolhida se ainda não estiver conectada e cria o pedido. Não existe "confirmado" sem resposta do servidor: o pedido nasce `pending`.
- **"Comprar" adiciona ao carrinho** (a edição é escolhida nos chips `1/N`). Comprar direto pularia o resumo, que é onde preço e disponibilidade são revalidados.
- Mudanças de preço ou estoque são anunciadas em região live (`aria-live`), além do toast, e a compra é bloqueada até o usuário aceitar.
- Formulários mostram o erro do servidor no campo correspondente e levam o foco ao primeiro campo inválido. No mobile, os dados do colecionador ficam recolhidos e se abrem sozinhos quando há erro.
- Carrossel do destaque pausa com mouse ou foco e respeita "reduzir movimento".

## Desvios do Figma

| Tela                    | Figma                                                      | Implementado                                                                      | Por quê                                                                                                   |
| ----------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Login/cadastro          | Google e Facebook, "Esqueceu a senha?"                     | Aparecem, mas avisam que não estão disponíveis                                    | Não há provedor OAuth nem envio de e-mail na demonstração                                                 |
| Login/cadastro (mobile) | Sem botão de fechar                                        | Botão redondo de fechar no canto                                                  | Saída clara da tela cheia, também por teclado (Esc)                                                       |
| Detalhe                 | Botão "Comprar" / "Comprar NFT"                            | Adiciona ao carrinho; no mobile, o botão do carrinho ao lado leva ao carrinho     | Revalidação de preço no resumo                                                                            |
| Pagamento (desktop)     | Asterisco em Código de indicação e Nome ENS                | Opcionais, com "(opcional)" no rótulo                                             | Nem todo colecionador tem indicação ou ENS                                                                |
| Pagamento (mobile)      | "Carteira e rede" lista WalletConnect, MetaMask e Coinbase | Lista as redes (Ethereum, Polygon, Solana) da carteira escolhida                  | No modelo de dados o provedor é propriedade da carteira cadastrada; a escolha que muda a cotação é a rede |
| Pagamento (mobile)      | Sem formulário do colecionador                             | Seções recolhíveis "Dados do colecionador" (pré-preenchidos) e "Resumo do pedido" | A API exige esses dados; recolhidos, a tela continua igual ao Figma                                       |
| Pagamento (mobile)      | "Trocar carteira" e menu ⋮                                 | Levam a Minha conta → Carteiras                                                   | Onde as carteiras são editadas                                                                            |
| Início (mobile)         | Botão central de "escanear" nas abas                       | Abre a busca de NFTs                                                              | Não há leitor de QR code na demonstração                                                                  |
| Início (mobile)         | Selo "RARO"                                                | Aparece quando restam 3 edições ou menos                                          | O resumo do catálogo não tem raridade; escassez é o dado disponível                                       |
| Minha conta             | Ofertas, Arquivos baixados, Suporte                        | Páginas simples com estado vazio                                                  | Fora do escopo do desafio                                                                                 |
| Geral                   | Ilustrações do Figma                                       | Recortes das artes do PNG em WebP                                                 | Mantém a identidade sem embutir os SVGs pesados no bundle                                                 |

As referências ficam em `design/figma/desktop/` (PNG) e `design/figma/mobile/` (SVG). Elas não fazem parte do bundle.

## Limitações conhecidas

- Não há backend real: a API e o Socket.IO são simulados no navegador. Dados ficam no `localStorage` de cada navegador e não são compartilhados entre dispositivos.
- `@mswjs/socket.io-binding` não tem rooms nem `auth` no handshake: o token vai na query string e o roteamento por usuário é feito no servidor simulado ([docs/REALTIME.md](docs/REALTIME.md)).
- Conexão de carteira e explorador de blocos são simulados; nenhuma extensão é aberta.
- Firefox e WebKit não foram executados no ambiente desta entrega (o download dos navegadores estava bloqueado); a configuração está pronta em `playwright.config.ts`.
- Na Lighthouse mobile (Início 83, Detalhe 85; meta 90), o service worker do MSW fica no caminho do LCP e o render inicial sob CPU 4× pesa no TBT; com uma API real a parte do MSW desaparece ([docs/PERFORMANCE.md](docs/PERFORMANCE.md)).
