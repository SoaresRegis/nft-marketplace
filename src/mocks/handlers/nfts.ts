import { HttpResponse, http } from 'msw'
import Big from 'big.js'
import { catalogViews, categories, chains, sortOptions, type CatalogFacets, type Category, type Chain } from '@/api/contracts'
import * as money from '@/lib/money'
import { db, findNft, nftAvailable, nftPrice, scenario, toDetail, toSummary } from '../db'
import type { NftRecord } from '../fixtures/nfts'

const NEW_WINDOW_MS = 45 * 86_400_000
const TRENDING_MIN_LIKES = 500

function byView(list: NftRecord[], view: string) {
  if (view === 'new') {
    const newest = Math.max(...db.nfts.map((n) => Date.parse(n.createdAt)))
    return list.filter((n) => newest - Date.parse(n.createdAt) <= NEW_WINDOW_MS)
  }
  if (view === 'trending') return list.filter((n) => n.likes >= TRENDING_MIN_LIKES)
  return list
}

function facetsFor(list: NftRecord[], all: NftRecord[]): CatalogFacets {
  const count = <K extends string>(keys: readonly K[], get: (n: NftRecord) => K) =>
    Object.fromEntries(keys.map((k) => [k, list.filter((n) => get(n) === k).length])) as Record<K, number>
  const prices = all.map(nftPrice)
  const min = prices.reduce((a, b) => (money.cmp(a, b) <= 0 ? a : b), prices[0] ?? '0')
  const max = prices.reduce((a, b) => (money.cmp(a, b) >= 0 ? a : b), prices[0] ?? '0')
  return { categories: count(categories, (n) => n.category), chains: count(chains, (n) => n.chain), priceRange: { min, max } }
}
import { fail } from '../http-utils'

export const nftHandlers = [
  http.get('*/api/nfts/featured', () => {
    const items = scenario.catalogEmpty ? [] : db.nfts.filter((n) => n.featured).map(toDetail)
    return HttpResponse.json({ items })
  }),

  http.get('*/api/nfts', ({ request }) => {
    const url = new URL(request.url)
    const sp = url.searchParams
    const q = sp.get('q')?.trim().toLowerCase() ?? ''
    const cats = sp.getAll('category')
    const chs = sp.getAll('chain')
    const minPrice = sp.get('minPrice')
    const maxPrice = sp.get('maxPrice')
    const availability = sp.get('availability') ?? 'all'
    const view = sp.get('view') ?? 'all'
    const sort = sp.get('sort') ?? 'recent'
    const page = Number(sp.get('page') ?? '1')
    const pageSize = Number(sp.get('pageSize') ?? '12')

    const fields: Record<string, string> = {}
    if (cats.some((c) => !categories.includes(c as Category))) fields.category = 'Categoria inválida'
    if (chs.some((c) => !chains.includes(c as Chain))) fields.chain = 'Rede inválida'
    if (minPrice && !money.isEth(minPrice)) fields.minPrice = 'Preço mínimo inválido'
    if (maxPrice && !money.isEth(maxPrice)) fields.maxPrice = 'Preço máximo inválido'
    if (!sortOptions.includes(sort as never)) fields.sort = 'Ordenação inválida'
    if (!catalogViews.includes(view as never)) fields.view = 'Aba inválida'
    if (!Number.isInteger(page) || page < 1) fields.page = 'Página inválida'
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) fields.pageSize = 'Tamanho de página inválido'
    if (Object.keys(fields).length) return fail(422, 'VALIDATION_ERROR', 'Parâmetros de busca inválidos.', { fields })

    const catalog = scenario.catalogEmpty ? [] : db.nfts
    let list = byView([...catalog], view)
    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.creator.name.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    const facets = facetsFor(list, catalog)
    if (cats.length) list = list.filter((n) => cats.includes(n.category))
    if (chs.length) list = list.filter((n) => chs.includes(n.chain))
    if (minPrice) list = list.filter((n) => new Big(nftPrice(n)).gte(minPrice))
    if (maxPrice) list = list.filter((n) => new Big(nftPrice(n)).lte(maxPrice))
    if (availability === 'available') list = list.filter((n) => nftAvailable(n) > 0)
    if (availability === 'sold-out') list = list.filter((n) => nftAvailable(n) === 0)

    const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
    list.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return money.cmp(nftPrice(a), nftPrice(b)) || byId(a, b)
        case 'price-desc':
          return money.cmp(nftPrice(b), nftPrice(a)) || byId(a, b)
        case 'popular':
          return b.likes - a.likes || byId(a, b)
        case 'name':
          return a.name.localeCompare(b.name, 'pt-BR') || byId(a, b)
        default:
          return b.createdAt.localeCompare(a.createdAt) || byId(a, b)
      }
    })

    const total = list.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const items = list.slice((page - 1) * pageSize, page * pageSize).map(toSummary)
    return HttpResponse.json({ items, page, pageSize, total, totalPages, facets })
  }),

  http.get('*/api/nfts/:id', ({ params }) => {
    const nft = findNft(String(params.id))
    if (!nft || scenario.catalogEmpty) return fail(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(toDetail(nft))
  }),
]
