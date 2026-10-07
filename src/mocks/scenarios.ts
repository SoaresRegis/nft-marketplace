/**
 * Cenários de rede e de negócio da camada de mocks. São determinísticos
 * (semente fixa) e configuráveis por:
 *  - query string na carga da página: ?mock=<preset>
 *  - endpoint de controle: PUT /__mock/scenario { preset?, ...overrides }
 *  - painel de cenários na interface de demonstração
 * O cenário ativo persiste em localStorage para sobreviver a refresh.
 */
export interface FailureRule {
  method?: string
  /** Regex aplicado ao pathname (ex.: "^/api/me/favorites"). */
  path: string
  status: number
  code?: string
  /** Quantas vezes falhar antes de voltar ao normal (padrão: sempre). */
  times?: number
  /** 'error' simula falha de conexão em vez de resposta HTTP. */
  kind?: 'http' | 'network'
}

export interface ScenarioConfig {
  preset: PresetName
  /** Latência base aplicada a toda requisição REST. */
  latency: { mode: 'none' | 'fixed' | 'variable'; ms: number; jitter: number }
  /** Listagens de NFT retornam fora de ordem (a primeira mais lenta). */
  outOfOrder: boolean
  /** Sem conexão: REST falha como erro de rede e o socket não conecta. */
  offline: boolean
  failures: FailureRule[]
  catalogEmpty: boolean
  /** Duração da sessão. */
  sessionTtlMs: number
  /** Cria o pedido mas a resposta só chega depois do timeout do cliente (uma vez). */
  orderTimeoutOnce: boolean
  payment: { outcome: 'confirm' | 'reject' | 'manual'; delayMs: number }
  walletConnect: 'approve' | 'reject'
  /** Após a primeira cotação, altera preço/estoque do primeiro item (uma vez). */
  checkoutMutation: 'none' | 'price-change' | 'sold-out'
  seed: number
}

export const PRESETS = {
  default: {},
  empty: { catalogEmpty: true },
  slow: { latency: { mode: 'fixed', ms: 2500, jitter: 0 } },
  'variable-latency': { latency: { mode: 'variable', ms: 300, jitter: 1200 } },
  'out-of-order': { outOfOrder: true },
  offline: { offline: true },
  'server-error': { failures: [{ path: '^/api/', status: 503, code: 'TRANSIENT_FAILURE' }] },
  flaky: { failures: [{ path: '^/api/nfts', status: 503, code: 'TRANSIENT_FAILURE', times: 1 }] },
  'session-short': { sessionTtlMs: 20_000 },
  'payment-rejected': { payment: { outcome: 'reject', delayMs: 1500 } },
  'payment-manual': { payment: { outcome: 'manual', delayMs: 0 } },
  'order-timeout': { orderTimeoutOnce: true },
  'price-change': { checkoutMutation: 'price-change' },
  'sold-out': { checkoutMutation: 'sold-out' },
  'wallet-reject': { walletConnect: 'reject' },
} satisfies Record<string, Partial<ScenarioConfig>>

export type PresetName = keyof typeof PRESETS
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[]

export const PRESET_LABELS: Record<PresetName, string> = {
  default: 'Padrão (sucesso)',
  empty: 'Catálogo vazio',
  slow: 'Rede lenta (2,5s)',
  'variable-latency': 'Latência variável',
  'out-of-order': 'Respostas fora de ordem',
  offline: 'Sem conexão',
  'server-error': 'Erro 503 em tudo',
  flaky: 'Falha transitória (1x)',
  'session-short': 'Sessão curta (20s)',
  'payment-rejected': 'Pagamento recusado',
  'payment-manual': 'Pagamento manual (pendente)',
  'order-timeout': 'Timeout ao criar pedido',
  'price-change': 'Preço muda no checkout',
  'sold-out': 'Esgota no checkout',
  'wallet-reject': 'Carteira recusa conexão',
}

export const BASE_SCENARIO: Omit<ScenarioConfig, 'preset'> = {
  latency: { mode: 'fixed', ms: 150, jitter: 0 },
  outOfOrder: false,
  offline: false,
  failures: [],
  catalogEmpty: false,
  sessionTtlMs: 2 * 60 * 60 * 1000,
  orderTimeoutOnce: false,
  payment: { outcome: 'confirm', delayMs: 2000 },
  walletConnect: 'approve',
  checkoutMutation: 'none',
  seed: 42,
}

export function buildScenario(preset: PresetName, overrides: Partial<ScenarioConfig> = {}): ScenarioConfig {
  return { ...BASE_SCENARIO, ...(PRESETS[preset] as Partial<ScenarioConfig>), ...overrides, preset }
}
