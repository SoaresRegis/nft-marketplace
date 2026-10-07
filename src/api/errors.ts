import { isAxiosError } from 'axios'
import { ZodError } from 'zod'
import { apiErrorBody, type ApiErrorCode } from './contracts'

/** Erro normalizado que toda a aplicação consome (UI, Query, formulários). */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly fields?: Record<string, string>
  readonly details?: unknown
  readonly retryable: boolean

  constructor(init: {
    code: ApiErrorCode
    message: string
    status: number | null
    fields?: Record<string, string>
    details?: unknown
    retryable?: boolean
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.fields = init.fields
    this.details = init.details
    this.retryable = init.retryable ?? false
  }

  get isAuthError() {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({ code: 'UNKNOWN', message: 'Requisição cancelada', status: null })
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        code: 'TIMEOUT',
        message: 'O servidor demorou para responder. Tente novamente.',
        status: null,
        retryable: true,
      })
    }
    if (!error.response) {
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
        status: null,
        retryable: true,
      })
    }
    const parsed = apiErrorBody.safeParse(error.response.data)
    const status = error.response.status
    if (parsed.success) {
      const { code, message, fields, details, retryable } = parsed.data.error
      return new ApiError({ code, message, status, fields, details, retryable: retryable ?? status >= 500 })
    }
    return new ApiError({
      code: status >= 500 ? 'TRANSIENT_FAILURE' : 'UNKNOWN',
      message: status >= 500 ? 'Falha temporária no servidor. Tente novamente.' : `Erro inesperado (${status}).`,
      status,
      retryable: status >= 500,
    })
  }
  if (error instanceof ZodError) {
    return new ApiError({ code: 'UNKNOWN', message: 'Resposta da API fora do contrato.', status: null })
  }
  return new ApiError({ code: 'UNKNOWN', message: 'Erro inesperado.', status: null })
}

export function isCanceled(error: unknown) {
  return isAxiosError(error) && error.code === 'ERR_CANCELED'
}
