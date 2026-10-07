import { z } from 'zod'
import { availabilityFilter, catalogView, categories, chains, sortOption, type CatalogView, type Category, type Chain, type NftListParams } from '@/api/contracts'

const asString = z.preprocess((v) => (v === undefined || v === null || v === '' ? undefined : String(v)), z.string().optional())
const ethString = z.preprocess(
  (v) => (v === undefined || v === null || v === '' ? undefined : String(v)),
  z.string().regex(/^\d+(\.\d{1,18})?$/).optional(),
)

export const catalogSearchSchema = z.object({
  q: asString.catch(undefined),
  category: asString.catch(undefined),
  chain: asString.catch(undefined),
  minPrice: ethString.catch(undefined),
  maxPrice: ethString.catch(undefined),
  availability: availabilityFilter.optional().catch(undefined),
  view: catalogView.optional().catch(undefined),
  sort: sortOption.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const PAGE_SIZE = 9

export function parseCsv<T extends string>(value: string | undefined, allowed: readonly T[]): T[] {
  if (!value) return []
  return value.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v))
}

export function toCsv(values: string[]) {
  return values.length ? values.join(',') : undefined
}

export function toListParams(s: CatalogSearch): NftListParams {
  const category = parseCsv<Category>(s.category, categories)
  const chain = parseCsv<Chain>(s.chain, chains)
  return {
    q: s.q?.trim() || undefined,
    category: category.length ? category : undefined,
    chain: chain.length ? chain : undefined,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    availability: s.availability && s.availability !== 'all' ? s.availability : undefined,
    view: s.view && s.view !== 'all' ? s.view : undefined,
    sort: s.sort ?? 'recent',
    page: s.page ?? 1,
    pageSize: PAGE_SIZE,
  }
}

export function activeFilterCount(s: CatalogSearch) {
  return (
    parseCsv(s.category, categories).length +
    parseCsv(s.chain, chains).length +
    (s.minPrice ? 1 : 0) +
    (s.maxPrice ? 1 : 0) +
    (s.availability && s.availability !== 'all' ? 1 : 0)
  )
}

export const CATEGORY_LABELS: Record<Category, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  memberships: 'Assinaturas',
  utility: 'Utilidade',
}

export const VIEW_LABELS: Record<CatalogView, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const CHAIN_LABELS: Record<Chain, string> = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }

export const SORT_LABELS: Record<NonNullable<CatalogSearch['sort']>, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  popular: 'Mais curtidos',
  name: 'Nome (A–Z)',
}
