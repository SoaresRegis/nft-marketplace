# Performance (Lighthouse)

## Como medir

```bash
pnpm build:demo && pnpm preview      # terminal 1
pnpm lighthouse                      # terminal 2
LH_PAGES=inicio LH_PROFILES=mobile pnpm lighthouse   # só uma combinação
```

- Configuração versionada em `lighthouse/config.mjs`: páginas, 3 execuções por página e perfil, perfis e metas.
- Cada execução usa um perfil de Chrome novo (carga fria, inclusive o registro do service worker do MSW).
- Saída em `lighthouse/reports/`: `<página>-<perfil>-run<n>.html|json`, `summary.json` (medianas, execuções e ambiente) e `summary.md`.
- O valor reportado é a **mediana** das 3 execuções.

## Resultados (mediana de 3)

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | mobile | **83** | 100 | 100 | 100 | 3685 ms | 0 | 217 ms |
| Detalhe | mobile | **85** | 100 | 100 | 100 | 3470 ms | 0 | 208 ms |
| Início | desktop | 99 | 100 | 100 | 100 | 810 ms | 0 | 7 ms |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 777 ms | 0 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. Todas atingidas, **exceto Performance no mobile (Início 83, Detalhe 85)**. Medido em 2026-10-07, depois das telas mobile do Figma.

### Ambiente

| | |
|---|---|
| Lighthouse | 13.5.0, throttling simulado |
| Mobile | Padrão do Lighthouse: Moto G Power emulado, 4G lento (150 ms RTT, 1,6 Mbps), CPU 4× |
| Desktop | 40 ms RTT, 10 Mbps, CPU 1×, 1350 × 940 |
| Navegador | HeadlessChrome 141 (Chromium do Playwright) |
| Máquina | Linux 6.18 x64, 4 vCPU Xeon 2.1 GHz, 17 GB, Node 22.22 |
| Build | `vite build --mode demo` (mocks ativos) servido por `vite preview` |

## Por que o mobile fica abaixo de 90

O elemento de LCP é a imagem do NFT em destaque, e o caminho até ela é:

1. HTML → entrada (1,5 KB) → em paralelo: app (React, TanStack, rotas) e **camada de mocks** (MSW, handlers, banco, ~55 KB gzip).
2. O MSW registra e ativa o service worker. Só então a API "responde".
3. `GET /nfts/featured` (com a latência simulada de 150 ms) → render → download da imagem.

Os passos 1 (parte dos mocks) e 2 não existiriam em produção com uma API real: o build de demonstração carrega o servidor inteiro dentro do navegador, e a imagem de LCP depende dele. No desktop as mesmas páginas tiram 99 e 100, o que mostra que o custo vem de banda e CPU limitadas somadas a esse trabalho extra, não de layout ou renderização.

O TBT (~210 ms) vem do render inicial do React sob CPU 4×: na Início, o hero, os destaques e os 12 cards do catálogo; no Detalhe, a versão mobile do Figma, que monta galeria, painel, abas, "Mais desta coleção" e a barra fixa de compra de uma vez (antes dessas telas o Detalhe mobile tirava 90). O detalhe desktop chegou a mostrar CLS de 0,28 porque o rodapé aparecia na primeira dobra durante o carregamento e descia depois; o `<main>` agora tem altura mínima de uma tela e o CLS voltou a 0.

## O que foi feito

| Mudança | Efeito |
|---|---|
| Entrada mínima: `main.tsx` só importa CSS e dispara em paralelo `import('./mocks/browser')` e `import('./app/bootstrap')`. O Axios espera o transporte pronto (`transport-ready.ts`) antes da primeira requisição | Mocks e app baixam e avaliam ao mesmo tempo, em vez de em sequência |
| Shim de `tough-cookie` (`src/mocks/shims/`): o MSW o importa para cookies, que a API simulada não usa | Chunk de mocks de 332 KB para 179 KB (55 KB gzip) |
| Loader da rota inicial antecipa destaque e catálogo | As consultas começam antes do render |
| Rotas com `lazyRouteComponent`; `socket.io-client` carregado sob demanda | JS inicial só da tela atual |
| Imagem de destaque com `fetchpriority="high"` e dimensões explícitas; demais com `loading="lazy"` | Prioridade correta e CLS zero |
| Fontes auto-hospedadas (`@fontsource`, só latin) com `font-display: swap` | Sem requisição a terceiros |
| `manualChunks` para React e TanStack | Cache estável entre deploys |

Mobile inicial antes dessas mudanças: 74. Depois: 80. Detalhe: de 81 para 90.

### Testado e descartado

- `<link rel="modulepreload">` para os chunks importados dinamicamente: no 4G simulado, os chunks competem por banda com o CSS e as fontes; FCP piorou de 2,5 s para 3,2–3,4 s e a nota caiu para 76–77.
- Render inicial dentro de `startTransition`: sem ganho mensurável, porque o trabalho pesado ocorre quando os dados chegam (atualização síncrona via `useSyncExternalStore`).

## Próximos passos possíveis

- Num deploy real (sem mocks no bundle), medir de novo: o caminho do LCP perde o service worker e ~55 KB.
- Pré-renderizar o hero (SSG) para FCP antes do JavaScript.
- Adiar componentes Radix que ficam abaixo da dobra (select de ordenação, painel de filtros) para um chunk separado.
- Avaliar `zod/mini` para reduzir o chunk de contratos.
