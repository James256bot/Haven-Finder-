const API_BASE = 'https://havenfinderapi-production.up.railway.app';

export type ParsedQuery = {
  q: string;
  propertyType?: string;
  listingType?: string;
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  city?: string;
  country?: string;
  neighborhood?: string;
  furnished?: boolean;
  verified?: boolean;
  parking?: boolean;
  pool?: boolean;
  gym?: boolean;
  aircon?: boolean;
  garden?: boolean;
  security?: boolean;
  petFriendly?: boolean;
  serviced?: boolean;
  nearUniversity?: string;
  maxCommuteMinutes?: number;
  commuteTo?: string;
  confidence: number;
  parser: 'rules' | 'llm' | 'hybrid';
  language: string;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  country: string | null;
  currency: string | null;
  price_amount: string | null;
  price_period: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  property_type: string | null;
  listing_type: string | null;
  main_image_url: string | null;
  verification: string | null;
  source_code: string | null;
};

export async function aiSearch(query: string, limit = 24): Promise<{
  parsed: ParsedQuery;
  listings: Listing[];
  total: number;
}> {
  const res = await fetch(`${API_BASE}/ai/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'AI search failed');
  return json.data;
}

export async function aiParseOnly(query: string): Promise<ParsedQuery> {
  const res = await fetch(`${API_BASE}/ai/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!json.success) throw new Error('Parse failed');
  return json.data.parsed;
}
