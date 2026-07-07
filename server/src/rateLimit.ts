/**
 * Limiteur à fenêtre fixe, par utilisateur. Garde-fou budget IA
 * (le vrai plafond reste celui d'OpenRouter). `now` injectable pour les tests.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs = 60_000
  ) {}

  /** true si la requête est autorisée (et la comptabilise), false si dépassement. */
  allow(key: string, now: number): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= this.maxPerWindow) return false;
    entry.count += 1;
    return true;
  }

  /** Requêtes restantes dans la fenêtre courante. */
  remaining(key: string, now: number): number {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) return this.maxPerWindow;
    return Math.max(0, this.maxPerWindow - entry.count);
  }
}
