import type { ApiResponse, Listing } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}

export type ListingQuery = {
  limit?: number;
  offset?: number;
  country?: string;
  city?: string;
  listingType?: string;
  propertyType?: string;
  bedrooms?: string | number;
  minPrice?: string | number;
  maxPrice?: string | number;
  verification?: string;
  sort?: string;
  q?: string;
};

function qs(params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  return sp.toString();
}

export const api = {
  listings: (params: ListingQuery = {}) =>
    get<{ listings: Listing[]; total: number; limit: number; offset: number }>(
      `/listings?${qs(params)}`,
    ),
  listing: (slug: string) =>
    get<{ listing: Listing }>(`/listings/${slug}`),
  stats: () =>
    get<{ published: string; countries: string; cities: string }>('/stats'),
  countries: () =>
    get<{ countries: { code: string; name: string; count: number }[] }>(
      '/locations/countries',
    ),
  propertyTypes: () =>
    get<{ types: { type: string; count: number }[] }>(
      '/locations/property-types',
    ),
};
