/* services/api.ts - Cached API with 5min TTL */
import { apiUrl } from "apiurl";
import { getCache, setCache, clearCache } from "../cache";

/**
 * Build cache key: endpoint + params + auth flag.
 * Handles query params in endpoint (e.g., ?dealerid=123).
 */
function buildKey(endpoint: string, token?: string): string {
  return `${endpoint}_${token ? 'auth' : 'public'}`;
}

/**
 * Cached wrapper for apiGet. Checks cache first, fetches if miss/expired.
 */
export async function cachedGet(endpoint: string, token?: string): Promise<any> {
  const key = buildKey(endpoint, token);
  let data = getCache(key);

  if (data === null) {
    // Cache miss - fetch fresh
    const res = await fetch(`${apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Cache headers for images/other (CDN-friendly)
        'Cache-Control': 'public, max-age=300',
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error('API ERROR:', {
        url: `${apiUrl}${endpoint}`,
        status: res.status,
        response: text,
      });
      throw new Error(`API ${res.status}: ${text}`);
    }

    data = text ? JSON.parse(text) : [];
    setCache(key, data); // Cache for 5min
  }

  return data;
}

// Original apiGet (uncached, for mutations/writes)
export async function apiGet(endpoint: string, token?: string) {
  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    console.error('API ERROR:', {
      url: `${apiUrl}${endpoint}`,
      status: res.status,
      response: text,
    });
    throw new Error(`API ${res.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

// Utils: clear on logout/cart-clear etc.
export { clearCache } from "../cache";

