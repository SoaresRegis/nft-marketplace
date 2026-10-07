import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-700.css'
import './index.css'
import { setTransportReady } from '@/api/transport-ready'

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  setTransportReady(
    import('./mocks/browser')
      .then((m) => m.startMocks())
      .then(() => undefined),
  )
}

void import('./app/bootstrap')
