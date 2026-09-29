/**
 * AppCache — Module-level in-memory cache for master / frequently-read data
 * Sectore 360 — Performance optimization
 *
 * Design:
 *  - Promise-deduplication: a second caller while the first is in-flight
 *    gets the same promise, never a duplicate network request.
 *  - TTL: entries are considered stale after `ttlMs` and re-fetched on next access.
 *  - Invalidate: mutating services call invalidate() so next read is fresh.
 *  - No external dependencies — pure TypeScript.
 */

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

interface InFlight {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Promise<any> | undefined;
}

const store  = new Map<string, CacheEntry<unknown>>();
const flying: InFlight = {};

/**
 * Get a cached value, fetching when missing or stale.
 * @param key     Unique cache key
 * @param fetcher Async function that loads the data
 * @param ttlMs   How long (ms) before the entry is considered stale (default 5 min)
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  const now   = Date.now();

  // Fresh hit — return immediately
  if (entry && now - entry.fetchedAt < ttlMs) return entry.data;

  // In-flight deduplication — re-use existing promise
  if (flying[key]) return flying[key] as Promise<T>;

  // Start fetch
  const promise = fetcher().then((data) => {
    store.set(key, { data, fetchedAt: Date.now() });
    delete flying[key];
    return data;
  }).catch((err) => {
    delete flying[key];
    // Return stale data if available rather than throwing
    const stale = store.get(key) as CacheEntry<T> | undefined;
    if (stale) return stale.data;
    throw err;
  });

  flying[key] = promise;
  return promise;
}

/** Synchronously read the cached value (or null if absent/stale). */
export function peek<T>(key: string, ttlMs = 5 * 60 * 1000): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() - entry.fetchedAt >= ttlMs) return null;
  return entry.data;
}

/** Invalidate one or more cache keys so next access re-fetches. */
export function invalidate(...keys: string[]): void {
  keys.forEach((k) => store.delete(k));
}

/** Invalidate all entries whose key starts with a prefix. */
export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Clear the entire cache. */
export function clearAll(): void {
  store.clear();
}

// ── Named cache keys (prevents typos across callers) ────────────────────────
export const CK = {
  customers:       'customers:all',
  customersActive: 'customers:active',
  assets:          'assets:all',
  engineers:       'engineers:all',
  companyProfile:  'company:profile',
  taskStats:       'tasks:stats',
  masterData:      (type: string) => `master:${type}`,
  assetsByCustomer:(id: string)   => `assets:cust:${id}`,
} as const;
