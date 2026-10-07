import { setupWorker } from 'msw/browser'
import { scenario, setScenario, resetDb, db, persist } from './db'
import { handlers } from './handlers'
import { settleDue } from './mutations'
import { resetNetworkState } from './network'
import { buildScenario, PRESET_NAMES, type PresetName } from './scenarios'

/**
 * Inicia a camada de mocks. Parâmetros de URL na carga:
 *  - ?mock=<preset>  troca o cenário (persistido)
 *  - ?mock-reset     restaura o estado inicial dos dados
 */
export async function startMocks() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('mock-reset')) resetDb(scenario.preset)
  const preset = params.get('mock')
  if (preset && (PRESET_NAMES as string[]).includes(preset) && preset !== scenario.preset) {
    setScenario(buildScenario(preset as PresetName))
    db.consumed = {}
    persist()
  }
  resetNetworkState()

  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  await settleDue()
  ;(window as unknown as { __nftMockReady?: boolean }).__nftMockReady = true
  return worker
}
