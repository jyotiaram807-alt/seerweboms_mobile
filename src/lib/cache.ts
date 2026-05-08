/**
 * Simple in-memory cache with TTL support.
 * Key: `${endpoint}_${params}_${token? 'auth': 'public'}`
 * TTL: 5 minutes (300000ms) - good for product lists, orders.
 * Invalidate: manual clear or TTL expiry.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const CACHE = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5min

/**
 * Get cached data or return null if expired/missing.
 */
export function getCache(key: string): any | null {
  const entry = CACHE.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.ttl) {
    // Expired
    CACHE.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cache entry.
 */
export function setCache(key: string, data: any, ttl: number = DEFAULT_TTL): void {
  CACHE.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Check if key exists and valid.
 */
export function hasCache(key: string): boolean {
  return getCache(key) !== null;
}

/**
 * Clear specific key or all.
 */
export function clearCache(key?: string): void {
  if (key) {
    CACHE.delete(key);
  } else {
    CACHE.clear();
  }
}

/**
 * Clear on events: e.g., logout, cart clear.
 */
export function invalidateCaches(pattern?: string): void {
  if (!pattern) {
    CACHE.clear();
    return;
  }
  // Simple prefix match (extend for regex if needed)
  for (const key of Array.from(CACHE.keys())) {
    if (key.startsWith(pattern)) {
      CACHE.delete(key);
    }
  }
}

// Export for debugging/clearing
export { CACHE, DEFAULT_TTL };

