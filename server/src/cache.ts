/** Cache mémoire à TTL. Évite de régénérer un même résultat IA (économie tokens). */
export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, now: number): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, now: number): void {
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
