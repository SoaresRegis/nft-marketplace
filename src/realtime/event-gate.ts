export class EventGate {
  private seen = new Set<string>()
  private order: string[] = []
  private versions = new Map<string, number>()

  constructor(private readonly capacity = 500) {}

  accept(event: { eventId: string; resource: { type: string; id: string }; version: number }, knownVersion?: number) {
    if (this.seen.has(event.eventId)) return false
    this.remember(event.eventId)
    const key = `${event.resource.type}:${event.resource.id}`
    const current = Math.max(this.versions.get(key) ?? -1, knownVersion ?? -1)
    if (event.version <= current) return false
    this.versions.set(key, event.version)
    return true
  }

  observe(type: string, id: string, version: number) {
    const key = `${type}:${id}`
    if ((this.versions.get(key) ?? -1) < version) this.versions.set(key, version)
  }

  reset() {
    this.seen.clear()
    this.order = []
    this.versions.clear()
  }

  private remember(id: string) {
    this.seen.add(id)
    this.order.push(id)
    if (this.order.length > this.capacity) this.seen.delete(this.order.shift()!)
  }
}
