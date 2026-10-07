export function readStorage(key: string, area: 'local' | 'session' = 'local'): string | null {
  try {
    return (area === 'local' ? localStorage : sessionStorage).getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null, area: 'local' | 'session' = 'local') {
  try {
    const s = area === 'local' ? localStorage : sessionStorage
    if (value === null) s.removeItem(key)
    else s.setItem(key, value)
  } catch {
  }
}

export function readJson<T>(key: string, area: 'local' | 'session' = 'local'): T | null {
  const raw = readStorage(key, area)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown, area: 'local' | 'session' = 'local') {
  writeStorage(key, value === null ? null : JSON.stringify(value), area)
}
