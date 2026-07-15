const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const DAILY_LIMIT = 100;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Periodic cleanup of expired entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, DAY_IN_MS);

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + DAY_IN_MS });
    return { allowed: true, remaining: DAILY_LIMIT - 1, resetTime: now + DAY_IN_MS };
  }

  if (record.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: DAILY_LIMIT - record.count, resetTime: record.resetTime };
}
