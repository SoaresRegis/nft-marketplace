import { HttpResponse, delay, http } from 'msw'
import { scenario } from './db'
import { fail } from './http-utils'
import { mulberry32 } from './rng'

let rand = mulberry32(scenario.seed)
let listCounter = 0
const failureHits = new Map<number, number>()

export function resetNetworkState() {
  rand = mulberry32(scenario.seed)
  listCounter = 0
  failureHits.clear()
}

function latencyFor(url: URL, method: string) {
  if (scenario.outOfOrder && method === 'GET' && /\/api\/nfts$/.test(url.pathname)) {
    listCounter += 1
    return listCounter % 2 === 1 ? 1600 : 200
  }
  const { mode, ms, jitter } = scenario.latency
  if (mode === 'none') return 0
  if (mode === 'fixed') return ms
  return Math.round(ms + rand() * jitter)
}

export const networkConditions = http.all(/\/api\//, async ({ request }) => {
  const url = new URL(request.url)
  if (scenario.offline) {
    await delay(100)
    return HttpResponse.error()
  }
  for (const [index, rule] of scenario.failures.entries()) {
    if (rule.method && rule.method.toUpperCase() !== request.method) continue
    if (!new RegExp(rule.path).test(url.pathname)) continue
    const hits = failureHits.get(index) ?? 0
    if (rule.times !== undefined && hits >= rule.times) continue
    failureHits.set(index, hits + 1)
    await delay(latencyFor(url, request.method))
    if (rule.kind === 'network') return HttpResponse.error()
    const code = (rule.code as never) ?? (rule.status >= 500 ? 'TRANSIENT_FAILURE' : 'UNKNOWN')
    return fail(rule.status, code, rule.status >= 500 ? 'Serviço temporariamente indisponível.' : 'Requisição recusada.', {
      retryable: rule.status >= 500,
    })
  }
  await delay(latencyFor(url, request.method))
})
