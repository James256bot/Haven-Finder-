import { createHash } from 'node:crypto';
import { parseQueryRules } from './rules-parser';
import { parseQueryLLM } from './llm-parser';
import { ParsedQuerySchema, type ParsedQuery } from './schema';

type CacheEntry = { value: ParsedQuery; expiresAt: number };
const CACHE_MAX = 2000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(input: string) {
  return createHash('sha256').update(input.toLowerCase().trim()).digest('hex').slice(0, 32);
}

function cacheGet(key: string): ParsedQuery | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { cache.delete(key); return null; }
  return entry.value;
}

function cacheSet(key: string, value: ParsedQuery) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const metrics = {
  rulesHits: 0,
  llmHits: 0,
  llmFailures: 0,
  cacheHits: 0,
  fallbackHits: 0,
  total: 0,
};

export function getAiSearchMetrics() {
  return { ...metrics, cacheSize: cache.size };
}

export async function parseSearchQuery(input: string): Promise<ParsedQuery> {
  metrics.total++;
  const key = cacheKey(input);

  const cached = cacheGet(key);
  if (cached) { metrics.cacheHits++; return cached; }

  const rulesResult = parseQueryRules(input);

  if (rulesResult.confidence >= 0.5) {
    metrics.rulesHits++;
    cacheSet(key, rulesResult);
    return rulesResult;
  }

  try {
    const llmResult = await parseQueryLLM(input);
    if (llmResult) {
      metrics.llmHits++;
      const merged = ParsedQuerySchema.parse({
        ...llmResult,
        city: llmResult.city ?? rulesResult.city,
        neighborhood: llmResult.neighborhood ?? rulesResult.neighborhood,
        country: llmResult.country ?? rulesResult.country,
        currency: llmResult.currency ?? rulesResult.currency,
        bedrooms: llmResult.bedrooms ?? rulesResult.bedrooms,
        bathrooms: llmResult.bathrooms ?? rulesResult.bathrooms,
        parser: 'hybrid',
        confidence: Math.min(1, (llmResult.confidence ?? 0) + 0.15),
      });
      cacheSet(key, merged);
      return merged;
    }
  } catch {
    metrics.llmFailures++;
  }

  metrics.fallbackHits++;
  cacheSet(key, rulesResult);
  return rulesResult;
}
