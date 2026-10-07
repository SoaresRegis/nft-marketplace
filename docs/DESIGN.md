# Design, assets e acessibilidade

## Referência do Figma

A tela **Desktop / Início** foi recebida como exportação PNG do Figma e está em [`design/figma/desktop/inicio.png`](../design/figma/desktop/inicio.png) (frame 1440 × 3668, padding 24/120 px, gap de 96 px entre seções; o PNG está em 2x). A Início desktop segue esse frame: cabeçalho, hero com carrossel, catálogo com painel lateral (Coleções, Faixa de preço, Rede e "NFT em destaque"), cards de destaque, "Diário da Cunhagem" e rodapé com newsletter.

As demais telas desktop chegaram depois, também como PNG 1440 px (1x), em `design/figma/desktop/`:

| Tela | Referência | Rota |
|---|---|---|
| Detalhes do NFT | `detalhes-do-nft.png` | `/nft/:id` |
| Carrinho | `carrinho.png` | `/cart` |
| Pagamento | `pagamento.png` | `/checkout` |
| Confirmação de pedido | `confirmacao-de-pedido.png` | `/orders/:id` |
| Login | `login.png` | `/login` |
| Cadastro | `cadastro.png` | `/register` |
| Perfil do colecionador | `perfil-do-colecionador.png` | `/account/profile` |
| Carteiras | `carteiras.png` | `/account/wallets` |

Decisões ao seguir essas telas:
- **Entrar / Criar conta** são um modal sobre a Início (a Início fica inerte atrás). Fechar volta ao destino do `redirect`, ou à Início se ele for uma área protegida. Login com Google/Facebook e "Esqueceu a senha?" aparecem, mas avisam que não estão disponíveis na demonstração.
- **Detalhes:** o botão "Comprar" adiciona ao carrinho (a edição é escolhida nos chips `1/N`); "Mais desta coleção" é um carrossel com paginação por pontos.
- **Pagamento** é uma página única: dados do colecionador à esquerda, resumo e escolha de carteira/rede à direita. "Confirmar compra" valida o formulário, conecta a carteira (simulada) se preciso e cria o pedido.
- Campos com asterisco no Figma que não fazem sentido como obrigatórios (**Código de indicação** e **Nome ENS**) ficaram opcionais e dizem isso no rótulo.
- **Minha conta** ganhou a barra lateral do Figma; Atividade reaproveita a lista de pedidos, e Ofertas, Arquivos baixados e Suporte são páginas simples.

A marca do layout (**Kurio**) substituiu o nome provisório.

### Mobile

As telas mobile chegaram como SVG 414 × 896 em [`design/figma/mobile/`](../design/figma/mobile/): `inicio.svg`, `detalhes-do-nft.svg`, `carrinho.svg`, `pagamento.svg`, `login.svg` e `cadastro.svg`. Ficam fora do bundle (só referência).

O layout mobile vale abaixo de **768 px** (`max-md:` no Tailwind). Onde a estrutura do DOM muda de verdade (detalhe, linha do carrinho, pagamento), `useIsMobile()` (`src/lib/use-media-query.ts`, `matchMedia` + `useSyncExternalStore`) escolhe a árvore; no resto é só CSS.

| Tela | O que segue o SVG |
|---|---|
| Início | Busca em pílula "Explorar coleções" com botão de filtros (abre o painel lateral com ordenação), cartão do hero, abas roláveis, grade em duas colunas escalonada, selo "Raro" nos cards com até 3 unidades |
| Detalhes | Topo em gradiente com voltar e favoritar redondos, galeria com pontos e gesto de arrastar, painel arredondado com avaliação, chips de edição, abas e barra fixa inferior com quantidade, total e "Comprar NFT" |
| Carrinho | Barra "Carrinho de NFTs" com voltar, linhas com imagem, edição, total da linha e stepper circular; resumo como folha inferior, cupom em pílula e botão de finalizar em gradiente |
| Pagamento | "Carteira conectada" com cartões de carteira, lista de redes, seções recolhíveis "Dados do colecionador" e "Resumo do pedido", total e botão fixo "Confirmar compra" |
| Login / Cadastro | Tela cheia (sem a Início atrás), marca KURIO, campos em pílula, botões sociais e link para a outra tela no rodapé |
| Navegação | Barra inferior fixa (Início, Favoritos, Buscar, Carrinho, Perfil), escondida nas telas que têm barra de ação própria (detalhe, carrinho, pagamento, login, cadastro) |

Elementos flutuantes (toasts, painel de cenários, indicador de conexão) sobem acima das barras fixas pela variável CSS `--bottom-bar`, medida com `ResizeObserver`. Desvios do SVG e o motivo de cada um estão em [ARCHITECTURE.md](../ARCHITECTURE.md#desvios-do-figma).

## Tokens

Cores amostradas do PNG de referência; todas em `src/index.css`.

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#140D0A` | Fundo |
| `--card` | `#241612` | Superfícies, cards, painel de filtros |
| `--band` | `#38220F` | Faixa de informações do rodapé |
| `--primary` | `#D28A4C` | Botões, página ativa, slider |
| `--highlight` | `#E89B55` | Preço, links e item ativo |
| `--foreground` | `#F5F1EB` | Texto |
| `--caption` / `--muted-foreground` | `#CFB28C` | Texto secundário |
| `--strike` | `#B39463` | Preço "de" riscado |
| `--line` | `#8A5C33` | Linha do cabeçalho, bordas de campos |
| `--ring` | `#F0B27A` | Anel de foco |
| `--radius` | 8 px (cards 16 px, imagens grandes 24 px) | |
| Fonte | Roboto Mono 400/500/700 | Auto-hospedada via `@fontsource` (sem requisição a terceiros) |
| Container | até 1440 px com padding de 120 px a partir de 1280 (1200 px úteis em 1440); 40 px no tablet e 24 px no mobile | `.container-page` |

Breakpoints verificados: **390**, **768** e **1440** px. Os fluxos E2E rodam em 390 e 1440; um teste dedicado confere 768 px sem overflow horizontal nas telas principais.

## Substituições de assets

| Original | Substituto | Motivo |
|---|---|---|
| Artes dos NFTs | As quatro artes do layout, recortadas da exportação do Figma (`public/art/*.webp`, 464 px; versão grande de 864 px para o hero) e combinadas com nomes e números diferentes para os 60 NFTs do mock | Só existem quatro artes no layout; o catálogo precisa de 60 itens. Os SVGs gerados (`public/nfts/`) continuam disponíveis para variações futuras |
| Fotos de criadores e usuários | Avatares SVG gerados (`public/avatars/*`) | Mesmo motivo; evita rostos reais |
| Ícones | `lucide-react` | Biblioteca padrão do shadcn/ui, com tree-shaking |
| Hash de transação e explorer | Valores simulados e um diálogo "explorer simulado" | Não há blockchain; nenhum link leva a um site real |
| Newsletter do rodapé | Formulário validado que chama `POST /newsletter` no mock (201, ou 409 se o e-mail já está inscrito) | Não há serviço de e-mail; a inscrição fica no banco simulado |
| Filtro de disponibilidade | Sem controle no painel (o Figma não tem); continua aceito na URL e na API | Fidelidade ao layout sem quebrar links existentes |

Todos os textos de interface estão em português do Brasil.

## Ajustes de acessibilidade em relação ao layout

- Os tons do layout já passam AA: `#CFB28C` sobre `#241612` e `#140D0A`, e `#B39463` (preço riscado) sobre `#140D0A`.
- Foco sempre visível: anel de 3 px `#F0B27A`.
- Botões de ícone (remover, favoritar, menu) com área de toque de 40 px.
- Link "Pular para o conteúdo"; a cada navegação o foco vai para o `main`, e o título da página muda.
- Diálogos e drawers (Radix) prendem o foco, fecham com Esc e devolvem o foco a quem os abriu.
- Formulários com `label` associado, mensagens de erro ligadas por `aria-describedby`, `aria-invalid` e foco no primeiro campo inválido.
- Região live (`announce`) para resultado de buscas, adição ao carrinho, mudanças em tempo real, status do pedido e reconexão.
- Skeletons com shimmer, desligado em `prefers-reduced-motion` (todas as animações e transições também).
- Sem rolagem horizontal em 390 e 768 px (testado).
- Imagens com `alt` descritivo; decorativas com `alt=""`.
