import { HttpResponse } from 'msw'
import type { z } from 'zod'
import type { ApiErrorCode } from '@/api/contracts'
import { lookupSession } from './db'

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; details?: unknown; retryable?: boolean } = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

export function bearer(request: Request) {
  const h = request.headers.get('Authorization')
  return h?.startsWith('Bearer ') ? h.slice(7) : null
}

/** Exige sessão válida. Lança a resposta 401 (MSW aceita `throw Response`). */
export function requireUser(request: Request) {
  const token = bearer(request)
  const s = lookupSession(token)
  if (s.status === 'ok') return s.userId
  if (s.status === 'expired') throw fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  throw fail(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
}

export function optionalUser(request: Request): string | null {
  const token = bearer(request)
  if (!token) return null
  return requireUser(request)
}

export async function parseBody<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw fail(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido.')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_'
      fields[key] ??= issue.message
    }
    throw fail(422, 'VALIDATION_ERROR', 'Verifique os campos destacados.', { fields })
  }
  return parsed.data
}
