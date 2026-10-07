/**
 * Contratos tipados compartilhados entre transporte (Axios), estado (TanStack
 * Query), interface e a camada de mocks (MSW). Os schemas Zod validam as
 * respostas no cliente, então uma quebra de contrato vira erro explícito em vez
 * de dado corrompido na tela. Ver docs/CONTRACTS.md.
 */
import { z } from 'zod'

/** Valores em ETH trafegam como string decimal (até 18 casas). */
export const ethAmount = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor ETH inválido')
export type EthAmount = z.infer<typeof ethAmount>

export const isoDate = z.string()

// ---------------------------------------------------------------- erros ----

export const apiErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AVAILABILITY_CONFLICT',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_STALE',
  'IDEMPOTENCY_CONFLICT',
  'WALLET_REJECTED',
  'TRANSIENT_FAILURE',
  'NETWORK_ERROR',
  'TIMEOUT',
  'UNKNOWN',
])
export type ApiErrorCode = z.infer<typeof apiErrorCode>

export const apiErrorBody = z.object({
  error: z.object({
    code: apiErrorCode,
    message: z.string(),
    /** Erros por campo (path -> mensagem) para formulários. */
    fields: z.record(z.string(), z.string()).optional(),
    /** Dados extras (ex.: nova cotação em QUOTE_STALE). */
    details: z.unknown().optional(),
    retryable: z.boolean().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBody>

// ------------------------------------------------------------- usuários ----

export const user = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  bio: z.string(),
  /** Nome ENS sem o sufixo (".eth"); vazio quando não informado. */
  ensName: z.string(),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: isoDate,
})
export type User = z.infer<typeof user>

export const session = z.object({
  token: z.string(),
  user,
  expiresAt: isoDate,
})
export type Session = z.infer<typeof session>

export const sessionInfo = z.object({ user, expiresAt: isoDate })
export type SessionInfo = z.infer<typeof sessionInfo>

export const passwordRule = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

export const loginInput = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof loginInput>

export const registerInput = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Mínimo de 3 caracteres')
      .max(20, 'Máximo de 20 caracteres')
      .regex(/^[a-z0-9_]+$/i, 'Use apenas letras, números e _'),
    email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterInput = z.infer<typeof registerInput>

/** Nome ENS: letras minúsculas, números e hífen (o sufixo .eth fica fora). */
export const ensName = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^([a-z0-9-]{3,40})?$/, 'Use de 3 a 40 letras minúsculas, números ou hífen')

export const profileInput = z.object({
  name: z.string().trim().min(2, 'Informe seu nome de exibição'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(20, 'Máximo de 20 caracteres')
    .regex(/^[a-z0-9_]+$/i, 'Use apenas letras, números e _'),
  email: z.string().trim().email('E-mail inválido'),
  ensName,
  walletNickname: z.string().trim().min(2, 'Informe um apelido para a carteira').max(40, 'Máximo de 40 caracteres'),
})
export type ProfileInput = z.infer<typeof profileInput>

export const avatarInput = z.object({
  
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado'),
})
export type AvatarInput = z.infer<typeof avatarInput>

export const passwordChangeInput = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type PasswordChangeInput = z.infer<typeof passwordChangeInput>

// ----------------------------------------------------------------- NFTs ----

export const categories = ['digital-art', 'photography', 'music', '3d', 'collectibles', 'generative', 'gaming', 'memberships', 'utility'] as const
export const category = z.enum(categories)
export type Category = z.infer<typeof category>

export const chains = ['ethereum', 'polygon', 'solana'] as const
export const chain = z.enum(chains)
export type Chain = z.infer<typeof chain>

export const sortOptions = ['recent', 'price-asc', 'price-desc', 'popular', 'name'] as const
export const sortOption = z.enum(sortOptions)
export type SortOption = z.infer<typeof sortOption>

/** Abas do catálogo: todos, lançamentos recentes e em alta. */
export const catalogViews = ['all', 'new', 'trending'] as const
export const catalogView = z.enum(catalogViews)
export type CatalogView = z.infer<typeof catalogView>

export const availabilityFilters = ['all', 'available', 'sold-out'] as const
export const availabilityFilter = z.enum(availabilityFilters)

export const creator = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string(),
})
export type Creator = z.infer<typeof creator>

export const edition = z.object({
  id: z.string(),
  name: z.string(),
  priceEth: ethAmount,
  
  available: z.number().int().nonnegative(),
  supply: z.number().int().positive(),
  
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof edition>

export const nftSummary = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  creator,
  category,
  chain,
  
  priceEth: ethAmount,
 
  compareAtPriceEth: ethAmount.nullable(),
  highestBidEth: ethAmount.nullable(),
  available: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  createdAt: isoDate,
  featured: z.boolean(),
  version: z.number().int(),
})
export type NftSummary = z.infer<typeof nftSummary>

export const review = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  createdAt: isoDate,
  text: z.string(),
})
export type Review = z.infer<typeof review>

export const nftDetail = nftSummary.extend({
  description: z.string(),
  gallery: z.array(z.object({ src: z.string(), alt: z.string() })),
  editions: z.array(edition),
  tags: z.array(z.string()),
  contractAddress: z.string(),
  tokenStandard: z.string(),
  tokenId: z.string(),
  collection: z.string(),
  attributes: z.array(z.string()),
  royaltyPercent: z.number().nonnegative(),
  rating: z.object({ average: z.number().min(0).max(5), count: z.number().int().nonnegative() }),
  reviews: z.array(review),
})
export type NftDetail = z.infer<typeof nftDetail>

export const nftListParams = z.object({
  q: z.string().optional(),
  category: z.array(category).optional(),
  chain: z.array(chain).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  availability: availabilityFilter.optional(),
  view: catalogView.optional(),
  sort: sortOption.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParams>

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  })

export const catalogFacets = z.object({
  categories: z.record(category, z.number().int().nonnegative()),
  chains: z.record(chain, z.number().int().nonnegative()),
  priceRange: z.object({ min: ethAmount, max: ethAmount }),
})
export type CatalogFacets = z.infer<typeof catalogFacets>

export const nftList = paginated(nftSummary).extend({ facets: catalogFacets })
export type NftList = z.infer<typeof nftList>

export const featuredList = z.object({ items: z.array(nftDetail) })

export const favorites = z.object({ nftIds: z.array(z.string()) })
export type Favorites = z.infer<typeof favorites>

export const cartItem = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionName: z.string(),
  tokenId: z.string(),
  image: z.string(),
  chain,
  quantity: z.number().int().positive(),
  unitPriceEth: ethAmount,
  acknowledgedPriceEth: ethAmount,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  
  priceChanged: z.boolean(),
  exceedsAvailability: z.boolean(),
})
export type CartItem = z.infer<typeof cartItem>

export const cart = z.object({
  id: z.string(),
  ownerId: z.string().nullable(),
  items: z.array(cartItem),
  couponCode: z.string().nullable(),
  version: z.number().int(),
  updatedAt: isoDate,
})
export type Cart = z.infer<typeof cart>

export const addCartItemInput = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
export type AddCartItemInput = z.infer<typeof addCartItemInput>

export const updateCartItemInput = z.object({ quantity: z.number().int().positive() })

export const couponInput = z.object({ code: z.string().trim().min(1, 'Informe o cupom') })

// ------------------------------------------------------------- cotação ----

export const networks = ['ethereum', 'polygon', 'solana'] as const
export const network = z.enum(networks)
export type Network = z.infer<typeof network>

export const quoteIssue = z.object({
  type: z.enum(['PRICE_CHANGED', 'INSUFFICIENT_AVAILABILITY', 'SOLD_OUT', 'COUPON_INVALID', 'COUPON_EXPIRED']),
  itemId: z.string().optional(),
  message: z.string(),
})
export type QuoteIssue = z.infer<typeof quoteIssue>

export const quoteLine = z.object({
  itemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  editionName: z.string(),
  tokenId: z.string(),
  image: z.string(),
  quantity: z.number().int().positive(),
  unitPriceEth: ethAmount,
  lineTotalEth: ethAmount,
})
export type QuoteLine = z.infer<typeof quoteLine>

export const quote = z.object({
  id: z.string(),
  cartVersion: z.number().int(),
  network,
  lines: z.array(quoteLine),
  coupon: z
    .object({ code: z.string(), description: z.string() })
    .nullable(),
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  networkFeeEth: ethAmount,
  totalEth: ethAmount,
  issues: z.array(quoteIssue),
  /** true quando não há bloqueios para criar pedido. */
  valid: z.boolean(),
  expiresAt: isoDate,
  createdAt: isoDate,
})
export type Quote = z.infer<typeof quote>

export const quoteInput = z.object({ network })
export type QuoteInput = z.infer<typeof quoteInput>

// ----------------------------------------------------------- carteiras ----

/** Código de indicação: opcional, 4 a 16 letras ou números. */
export const referralCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^([A-Z0-9]{4,16})?$/, 'Use de 4 a 16 letras ou números')

export const walletProviders = ['metamask', 'coinbase', 'walletconnect', 'rainbow'] as const
export const walletProvider = z.enum(walletProviders)
export type WalletProvider = z.infer<typeof walletProvider>

export const wallet = z.object({
  id: z.string(),
  label: z.string(),
  provider: walletProvider,
  address: z.string(),
  role: z.enum(['primary', 'secondary']),
  networks: z.array(network),
  /** Dados de perfil vinculados à carteira */
  displayName: z.string(),
  profileName: z.string(),
  email: z.string(),
  ensName: z.string(),
  referralCode: z.string(),
  secondaryAddress: z.string(),
  updatedAt: isoDate,
})
export type Wallet = z.infer<typeof wallet>

export const walletInput = z.object({
  label: z.string().trim().min(2, 'Informe um nome para a carteira').max(40, 'Máximo de 40 caracteres'),
  provider: walletProvider,
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço deve começar com 0x e ter 40 caracteres hexadecimais'),
  role: z.enum(['primary', 'secondary']),
  networks: z.array(network).min(1, 'Selecione ao menos uma rede'),
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  email: z.string().trim().email('E-mail inválido'),
  ensName,
  referralCode: referralCode,
  secondaryAddress: z
    .string()
    .trim()
    .regex(/^(0x[a-fA-F0-9]{40}|[a-z0-9-]{3,40}\.eth)?$/, 'Informe um endereço 0x ou um nome .eth'),
})
export type WalletInput = z.infer<typeof walletInput>

export const walletConnectInput = z.object({ network })
export const walletConnection = z.object({
  walletId: z.string(),
  network,
  status: z.enum(['connected', 'disconnected']),
  connectedAt: isoDate.nullable(),
})
export type WalletConnection = z.infer<typeof walletConnection>

// ------------------------------------------------------------- pedidos ----

export const orderStatus = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof orderStatus>

/** Perfil do colecionador no pagamento */
export const collectorInput = z.object({
  fullName: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(20, 'Máximo de 20 caracteres')
    .regex(/^[a-z0-9_]+$/i, 'Use apenas letras, números e _'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  email: z.string().trim().email('E-mail inválido'),
  ensName,
  referralCode,
  note: z.string().trim().max(500, 'Máximo de 500 caracteres'),
})
export type CollectorInput = z.infer<typeof collectorInput>

export const createOrderInput = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network,
  collector: collectorInput,
})
export type CreateOrderInput = z.infer<typeof createOrderInput>

export const order = z.object({
  id: z.string(),
  userId: z.string(),
  status: orderStatus,
  /** Snapshot imutável do pedido (recibo). */
  lines: z.array(quoteLine),
  coupon: z.object({ code: z.string(), description: z.string() }).nullable(),
  subtotalEth: ethAmount,
  discountEth: ethAmount,
  networkFeeEth: ethAmount,
  totalEth: ethAmount,
  network,
  wallet: z.object({ id: z.string(), label: z.string(), address: z.string(), provider: walletProvider }),
  collector: z.object({ fullName: z.string(), username: z.string(), profileName: z.string(), email: z.string(), note: z.string() }),
  transaction: z
    .object({ hash: z.string(), explorerUrl: z.string(), blockNumber: z.number().int().nullable() })
    .nullable(),
  failureReason: z.string().nullable(),
  version: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
})
export type Order = z.infer<typeof order>

export const orderList = z.object({ items: z.array(order) })

// -------------------------------------------------------- tempo real ----

/** Envelope comum: identidade estável, recurso afetado e versão. */
const eventEnvelope = <T extends z.ZodTypeAny, R extends string>(type: R, data: T) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.string(), id: z.string() }),
    version: z.number().int(),
    occurredAt: isoDate,
    data,
  })

export const nftUpdatedEvent = eventEnvelope(
  'nft.updated',
  z.object({
    nftId: z.string(),
    name: z.string(),
    priceEth: ethAmount,
    available: z.number().int().nonnegative(),
    editions: z.array(edition),
    changes: z.array(z.enum(['price', 'availability'])),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEvent>

export const orderUpdatedEvent = eventEnvelope(
  'order.updated',
  z.object({
    orderId: z.string(),
    userId: z.string(),
    status: orderStatus,
    transaction: order.shape.transaction,
    failureReason: z.string().nullable(),
  }),
)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEvent>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

// ----------------------------------------------------------- newsletter ----

export const newsletterInput = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
})
export type NewsletterInput = z.infer<typeof newsletterInput>
export const newsletterSubscription = z.object({ email: z.string(), subscribedAt: isoDate })
