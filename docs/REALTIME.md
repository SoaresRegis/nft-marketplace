# Tempo real (Socket.IO)

## Transporte

- **Cliente**: `socket.io-client` 4 real, transporte `websocket`, em `src/realtime/client.ts`. É carregado sob demanda, depois que a camada de mocks instalou a interceptação.
- **Servidor simulado**: `src/mocks/realtime.ts`, com `ws.link(VITE_SOCKET_URL)` do MSW e `toSocketIo()` de `@mswjs/socket.io-binding`. O MSW intercepta o WebSocket e o binding fala o protocolo Socket.IO/Engine.IO; o cliente não sabe que é simulado.
- Os eventos nascem **no servidor simulado**, como efeito de regras de negócio: mudança de preço ou estoque (`POST /__mock/nfts/:id`, cenários `price-change`/`sold-out`) e liquidação de pedidos. A UI nunca dispara eventos para si mesma.

## Um socket por sessão

`SessionEffects` abre o socket com o token atual. Em login, logout, troca de conta ou expiração, o socket anterior é encerrado com todos os listeners e outro é aberto com a nova identidade. Um contador de geração descarta qualquer callback de um socket antigo que ainda chegue.

## Do evento à tela

Eventos nunca tocam a UI diretamente. `src/realtime/sync.ts` valida o payload com zod e aplica no cache do TanStack Query; os componentes reagem ao cache.

| Evento | Efeito |
|---|---|
| `nft.updated` | Atualiza detalhe, listas e destaques no cache (preço, disponibilidade, edições, versão). Se o NFT está no carrinho, invalida carrinho e cotações, avisa por toast e na região live (`assertive`). No checkout, a revisão detecta a mudança e exige nova confirmação |
| `order.updated` | Só se `data.userId` for o usuário atual. Atualiza o pedido no cache, invalida a lista de pedidos e, ao confirmar, o carrinho. Toast e anúncio de confirmação ou recusa |

## Duplicatas e eventos antigos

`EventGate` (`src/realtime/event-gate.ts`) guarda os últimos 500 `eventId` aplicados e a maior versão vista por recurso (`tipo:id`). Um evento passa só se:

1. o `eventId` é inédito, **e**
2. `version` é maior que a versão conhecida, considerando também a versão já presente no cache vinda do REST.

Assim, replays exatos e eventos atrasados com dados divergentes são ignorados. Testado com `/__mock/events/replay` e `/__mock/events/stale` em `tests/e2e/10-realtime-resilience.spec.ts`.

## Reconexão

O cliente reconecta sozinho (400 ms a 3 s). Ao reconectar, `onReconnect` invalida catálogo (consultas ativas), carrinhos e pedidos, que são buscados de novo via REST: o que se perdeu durante a queda é reconciliado pelo estado do servidor, não por replay de eventos. O indicador no cabeçalho (`data-testid="realtime-status"`) mostra conectado, reconectando ou offline, e a mudança é anunciada.

Pedidos pendentes também têm polling de 5 s como rede de segurança, então um pedido confirmado durante a queda aparece mesmo que o evento nunca chegue.

## Isolamento por usuário

- O servidor simulado identifica a conexão pelo token e envia `order.updated` apenas às conexões do dono.
- O cliente ainda descarta qualquer `order.updated` cujo `userId` não seja o atual (defesa em profundidade). Teste: "evento de pedido de outro usuário é ignorado".
- Logout remove o cache privado e encerra a assinatura.

## Limitações do binding (e como foram contornadas)

`@mswjs/socket.io-binding` 0.2 é pequeno e não implementa tudo do Socket.IO:

| Limitação | Contorno |
|---|---|
| Sem namespaces, rooms ou broadcast | O servidor simulado mantém o conjunto de conexões e faz o roteamento por usuário |
| Handshake aceito imediatamente, sem `auth` | O token vai na query string da conexão (`?token=`). Num servidor real iria em `auth` e seria validado no handshake |
| Sem heartbeat do servidor | O mock envia o pacote Engine.IO `2` (ping) a cada 20 s; sem isso o cliente derruba a conexão por `pingTimeout` |
| O MSW remove `/socket.io/` do caminho antes de comparar | O link usa só a origem (`wss://realtime.nft-marketplace.local`) |
| Conexão recusada | `client.close(4001)`, usado nos cenários `offline` e `/__mock/socket/block` |
