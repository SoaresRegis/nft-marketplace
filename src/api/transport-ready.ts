/**
 * Sinal de "transporte pronto". Quando a camada de mocks está ativa, o Axios e
 * o Socket.IO aguardam o MSW iniciar; a interface renderiza antes disso.
 * Módulo sem dependências para poder ficar no entry mínimo.
 */
let ready: Promise<void> = Promise.resolve()

export function setTransportReady(promise: Promise<void>) {
  ready = promise
}

export const transportReady = () => ready
