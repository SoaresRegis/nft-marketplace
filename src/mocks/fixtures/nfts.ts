import type { Category, Chain, Creator, Edition, Review } from '@/api/contracts'
import { mulberry32, pick } from '../rng'

export const NFT_COUNT = 60

export interface NftRecord {
  id: string
  name: string
  description: string
  image: string
  gallery: { src: string; alt: string }[]
  creator: Creator
  category: Category
  chain: Chain
  highestBidEth: string | null
  likes: number
  createdAt: string
  featured: boolean
  tags: string[]
  contractAddress: string
  tokenStandard: string
  editions: Edition[]
  tokenId: string
  collection: string
  attributes: string[]
  royaltyPercent: number
  reviews: Review[]
  reviewCount: number
  onSale: boolean
  version: number
}

export const creators: Creator[] = [
  { id: 'cr-1', name: 'Animakid', avatarUrl: '/avatars/creator-1.svg' },
  { id: 'cr-2', name: 'Keepitreal', avatarUrl: '/avatars/creator-2.svg' },
  { id: 'cr-3', name: 'Shroomie', avatarUrl: '/avatars/creator-3.svg' },
  { id: 'cr-4', name: 'Moon Dancer', avatarUrl: '/avatars/creator-4.svg' },
  { id: 'cr-5', name: 'NebulaKid', avatarUrl: '/avatars/creator-5.svg' },
  { id: 'cr-6', name: 'Robotica', avatarUrl: '/avatars/creator-6.svg' },
  { id: 'cr-7', name: 'Mr Fox', avatarUrl: '/avatars/creator-7.svg' },
  { id: 'cr-8', name: 'Orbitian', avatarUrl: '/avatars/creator-8.svg' },
]

const ART = [
  { key: 'emerald', names: ['Emerald Ape', 'Jade Rebel', 'Verdant Ape'], alt: 'macaco de óculos redondos e jaqueta college verde', attributes: ['Óculos', 'Esmeralda', 'Jaqueta college'] },
  { key: 'nomad', names: ['Sage Nomad', 'Violet Nomad', 'Cosmic Bloom'], alt: 'gorila de chapéu bucket e moletom roxo', attributes: ['Chapéu bucket', 'Moletom', 'Lilás'] },
  { key: 'baron', names: ['Neon Vessel', 'Ivory Baron', 'Onyx Duke'], alt: 'chimpanzé de blazer bege e gola alta verde', attributes: ['Blazer', 'Gola alta', 'Ônix'] },
  { key: 'beat', names: ['Golden Beat', 'Golden Signal', 'Amber Tune'], alt: 'orangotango de fones verdes e jaqueta clara', attributes: ['Fones', 'Dourado', 'Âmbar'] },
] as const

const REVIEWERS = ['Marina Costa', 'Lucas Prado', 'Beatriz Lima', 'Rafael Nunes', 'Camila Rocha', 'Diego Alves', 'Júlia Martins', 'Pedro Sato']
const REVIEW_TEXTS = [
  'A arte é ainda mais bonita em alta resolução. Transferência rápida para a minha carteira.',
  'Procedência clara e contrato verificado. Comprei a edição aberta e já quero a 1/10.',
  'Os detalhes do personagem são incríveis. Ótima peça para começar uma coleção.',
  'Cores fiéis à prévia e metadados completos. Recomendo.',
  'Bom acompanhamento do pedido em tempo real. A arte combina com o resto da coleção.',
  'Gostei do acesso aos lançamentos exclusivos que vem junto com o token.',
]
const RARITIES = ['Comum', 'Incomum', 'Raro', 'Épico']
const artSrc = (key: string, large = false) => (large && key === 'emerald' ? '/art/emerald-lg.webp' : key === 'nomad' && large ? '/art/nomad-portrait.webp' : `/art/${key}.webp`)
const collections = ['Genesis', 'Club', 'Drop', 'Origins', 'Vault', 'Society']
const cats: Category[] = ['digital-art', 'photography', 'music', '3d', 'collectibles', 'generative', 'gaming', 'memberships', 'utility']
const CATEGORY_POOL: Category[] = cats.flatMap((c, k) => Array<Category>(Math.round([33, 12, 65, 39, 23, 17, 19, 13, 18][k] / 6)).fill(c))
const chains: Chain[] = ['ethereum', 'ethereum', 'polygon', 'solana']
const editionNames = ['Standard', 'Rara', 'Lendária']
const tagPool = ['generativo', 'animado', '3D', 'pixel', 'abstrato', 'retrato', 'paisagem', 'áudio', 'colecionável', 'acesso']

const basePrices = ['0.05', '0.075', '0.12', '0.18', '0.25', '0.33', '0.42', '0.5', '0.64', '0.75', '0.99', '1.2', '1.5', '2.05', '2.5', '3.14159', '4.2', '0.0125']

export function buildNfts(): NftRecord[] {
  const rand = mulberry32(20261007)
  const start = Date.UTC(2026, 0, 5)
  const list: NftRecord[] = []
  for (let i = 0; i < NFT_COUNT; i++) {
    const n = String(i + 1).padStart(2, '0')
    const art = ART[i % ART.length]
    const name = `${art.names[Math.floor(i / ART.length) % art.names.length]} #${String((i * 37 + 42) % 1000).padStart(3, '0')}`
    const creator = creators[i % creators.length]
    const category = pick(mulberry32(9000 + i), CATEGORY_POOL) // gerador próprio: não altera a sequência de estoques
    const chain = pick(rand, chains)
    const base = basePrices[(i * 7) % basePrices.length]
    const editionCount = 1 + (i % 3)
    const editions: Edition[] = []
    for (let e = 0; e < editionCount; e++) {
      const supply = [25, 10, 3][e]
      // padrões determinísticos de disponibilidade
      let available = Math.max(0, Math.floor(rand() * supply))
      if (i % 11 === 4) available = 0 // NFT inteiramente esgotado
      if (e === 1 && i % 5 === 2) available = 0 // edição indisponível
      if (i === 0 && e === 0) available = 5
      const mult = ['1', '2.5', '6'][e]
      const price = (Number(base) * Number(mult)).toFixed(6).replace(/\.?0+$/, '')
      editions.push({
        id: `ed-${n}-${e + 1}`,
        name: editionNames[e],
        priceEth: price,
        available,
        supply,
        maxPerOrder: e === 0 ? 5 : e === 1 ? 2 : 1,
      })
    }
    const r = mulberry32(5000 + i) // gerador próprio: não altera a sequência de estoques
    const reviewCount = 3 + Math.floor(r() * 20)
    const reviews: Review[] = Array.from({ length: Math.min(reviewCount, 6) }, (_, k) => ({
      id: `rv-${n}-${k + 1}`,
      author: REVIEWERS[(i + k) % REVIEWERS.length],
      rating: r() < 0.75 ? 5 : 4,
      createdAt: new Date(start + i * 86_400_000 * 3 + (k + 2) * 86_400_000 * 2).toISOString(),
      text: REVIEW_TEXTS[(i + k * 5) % REVIEW_TEXTS.length],
    }))
    const createdAt = new Date(start + i * 86_400_000 * 3 + Math.floor(rand() * 86_400_000)).toISOString()
    list.push({
      id: `nft-${n}`,
      name,
      description: `${name} é uma obra ${category === 'music' ? 'sonora' : 'digital'} de ${creator.name}, retratando um ${art.alt}. Cada edição possui metadados verificados e royalties para o criador. Esta peça faz parte da coleção "Kurio ${collections[i % collections.length]}" e foi cunhada na rede ${chain}.`,
      image: artSrc(art.key),
      gallery: [0, 1, 2, 3].map((k) => {
        const other = ART[(i + k) % ART.length]
        return {
          src: artSrc(other.key, k === 0),
          alt: k === 0 ? `${name}: ${art.alt}` : `${name}, variação da coleção: ${other.alt}`,
        }
      }),
      creator,
      category,
      chain,
      highestBidEth: i % 4 === 0 ? null : (Number(base) * 0.9).toFixed(4).replace(/\.?0+$/, ''),
      likes: Math.floor(rand() * 900) + 10,
      createdAt,
      featured: [0, 7, 13, 21].includes(i),
      tags: [tagPool[i % tagPool.length], tagPool[(i * 3 + 1) % tagPool.length]],
      contractAddress: `0x${(0xabc000 + i).toString(16).padStart(40, '0')}`,
      tokenStandard: editionCount > 1 ? 'ERC-1155' : 'ERC-721',
      editions,
      tokenId: String((i * 37 + 42) % 1000).padStart(4, '0'),
      collection: `Kurio ${collections[i % collections.length]}`,
      attributes: [...art.attributes.slice(0, 2), RARITIES[i % RARITIES.length]],
      royaltyPercent: [5, 5, 7.5, 10][i % 4],
      reviews,
      reviewCount,
      onSale: i % 6 === 2 || i === 13,
      version: 1,
    })
  }
  return list
}
