/**
 * Sliding-window rate limiter (anti-spam / abuse prevention).
 * Mirrors a server-side middleware: buckets are keyed by actor (user id, email or
 * session) and expire automatically.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  hit(key: string, windowMs: number, max: number): { allowed: boolean; retryInMs: number } {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      const oldest = recent[0];
      this.hits.set(key, recent);
      return { allowed: false, retryInMs: Math.max(1000, oldest + windowMs - now) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, retryInMs: 0 };
  }

  clear(): void {
    this.hits.clear();
  }
}
