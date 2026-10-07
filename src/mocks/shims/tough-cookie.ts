export class MemoryCookieStore {
  idx: Record<string, unknown> = {}
}

export class Cookie {
  static fromJSON(): null {
    return null
  }
  toJSON() {
    return {}
  }
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}
  getCookiesSync(_url: string): Cookie[] {
    return []
  }
  async setCookie(_cookie: string, _url: string): Promise<void> {}
}
