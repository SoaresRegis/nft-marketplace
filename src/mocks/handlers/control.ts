/**
 * Endpoints de controle da simulação (fora de /api). Usados pelo painel de
 * cenários da demo e pelos testes Playwright para disparar eventos,
 * derrubar o socket, expirar sessões e trocar de cenário de forma
 * reprodutível. Também passam pelo MSW: nada é injetado direto na UI.
 */
import { HttpResponse, http } from 'msw'
import { z } from 'zod'
import { db, findNft, persist, resetDb, scenario, setScenario } from '../db'
import { fail, parseBody } from '../http-utils'
import { settleOrder, updateEdition } from '../mutations'
import { resetNetworkState } from '../network'
import { realtimeControl } from '../realtime'
import { buildScenario, PRESET_LABELS, PRESET_NAMES, type PresetName, type ScenarioConfig } from '../scenarios'

const presetSchema = z.enum(PRESET_NAMES as [PresetName, ...PresetName[]])
const scenarioBody = z.object({ preset: presetSchema.optional(), overrides: z.record(z.string(), z.unknown()).optional() })

export const controlHandlers = [
  http.get('*/__mock/state', () =>
    HttpResponse.json({
      scenario,
      presets: PRESET_NAMES.map((name) => ({ name, label: PRESET_LABELS[name] })),
      connections: realtimeControl.connections(),
      sessions: db.sessions.length,
    }),
  ),

  http.post('*/__mock/reset', async ({ request }) => {
    const body = await parseBody(request, scenarioBody)
    resetDb(body.preset ?? 'default', (body.overrides ?? {}) as Partial<ScenarioConfig>)
    resetNetworkState()
    realtimeControl.reset()
    return HttpResponse.json({ ok: true, scenario })
  }),

  http.put('*/__mock/scenario', async ({ request }) => {
    const body = await parseBody(request, scenarioBody)
    setScenario(buildScenario(body.preset ?? scenario.preset, (body.overrides ?? {}) as Partial<ScenarioConfig>))
    db.consumed = {}
    persist()
    resetNetworkState()
    if (scenario.offline) realtimeControl.dropAll()
    return HttpResponse.json({ ok: true, scenario })
  }),

  http.post('*/__mock/nfts/:id', async ({ request, params }) => {
    const body = await parseBody(
      request,
      z.object({
        editionId: z.string().optional(),
        priceEth: z.string().regex(/^\d+(\.\d{1,18})?$/).optional(),
        available: z.number().int().nonnegative().optional(),
      }),
    )
    const nft = updateEdition(String(params.id), body.editionId, body)
    if (!nft) return fail(404, 'NOT_FOUND', 'NFT/edição não encontrada.')
    return HttpResponse.json({ ok: true, version: nft.version })
  }),

  http.post('*/__mock/session/expire', () => {
    db.sessions.forEach((s) => (s.expiresAt = Date.now() - 1))
    persist()
    return HttpResponse.json({ ok: true })
  }),

  http.post('*/__mock/socket/:action', ({ params }) => {
    const action = String(params.action)
    if (action === 'drop') realtimeControl.dropAll()
    else if (action === 'block') realtimeControl.block()
    else if (action === 'unblock') realtimeControl.unblock()
    else return fail(404, 'NOT_FOUND', 'Ação desconhecida.')
    return HttpResponse.json({ ok: true, connections: realtimeControl.connections() })
  }),

  http.get('*/__mock/events', () => HttpResponse.json({ items: realtimeControl.log() })),

  http.post('*/__mock/events/replay', async ({ request }) => {
    const body = await parseBody(request, z.object({ type: z.enum(['nft.updated', 'order.updated']).optional() }))
    const event = realtimeControl.replayLast(body.type)
    return event ? HttpResponse.json({ ok: true, event }) : fail(404, 'NOT_FOUND', 'Nenhum evento para reenviar.')
  }),

  http.post('*/__mock/events/stale', async ({ request }) => {
    const { nftId } = await parseBody(request, z.object({ nftId: z.string() }))
    const nft = findNft(nftId)
    if (!nft) return fail(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json({ ok: true, event: realtimeControl.sendStale(nft) })
  }),

  http.post('*/__mock/orders/:id/settle', async ({ request, params }) => {
    const { outcome } = await parseBody(request, z.object({ outcome: z.enum(['confirm', 'reject']) }))
    const rec = await settleOrder(String(params.id), outcome)
    return rec ? HttpResponse.json({ ok: true, status: rec.order.status }) : fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
  }),

  http.get('*/__mock/orders/latest', () => {
    const latest = Object.values(db.orders).sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt))[0]
    return latest ? HttpResponse.json(latest.order) : fail(404, 'NOT_FOUND', 'Nenhum pedido.')
  }),
]
