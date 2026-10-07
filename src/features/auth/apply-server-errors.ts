import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/api/errors'

/** Mapeia erros por campo retornados pela API para o formulário. Retorna true se mapeou algum. */
export function applyServerErrors<T extends FieldValues>(error: ApiError, setError: UseFormSetError<T>, allowed: readonly string[]) {
  let mapped = false
  let first = true
  for (const [field, message] of Object.entries(error.fields ?? {})) {
    if (!allowed.includes(field)) continue
    setError(field as Path<T>, { type: 'server', message }, { shouldFocus: first })
    first = false
    mapped = true
  }
  return mapped
}
