import type { ApiResponse, Listing, MapPin } from '../types';

// In dev: Vite proxy forwards /api → localhost:3001 and strips /api.
// In prod: VITE_API_URL points at Railway, which has no /api prefix.
const VITE_API = (import.meta as any).env?.VITE_API_URL as string | undefined;
const BASE = VITE_API ? VITE_API : '/api';

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
  bathrooms?: string | number;
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
  mapPins: (params: ListingQuery = {}) =>
    get<{ pins: MapPin[]; capped: boolean }>(
      `/listings/map?${qs(params)}`,
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
