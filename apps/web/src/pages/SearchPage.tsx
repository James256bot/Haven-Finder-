import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../services/api';
import { PropertyCard } from '../components/PropertyCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { FilterPanel, type Filters } from '../components/FilterPanel';
import { Pagination } from '../components/Pagination';
import { MapView } from '../components/MapView';
import { ViewToggle, type ViewMode } from '../components/ViewToggle';
import { Seo } from '../components/Seo';

const PAGE_SIZE = 24;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('list');

  const filters: Filters = useMemo(() => ({
    country:      params.get('country')      ?? undefined,
    city:         params.get('city')         ?? undefined,
    listingType:  params.get('listingType')  ?? undefined,
    propertyType: params.get('propertyType') ?? undefined,
    bedrooms:     params.get('bedrooms')     ?? undefined,
    minPrice:     params.get('minPrice')     ?? undefined,
    maxPrice:     params.get('maxPrice')     ?? undefined,
    verification: params.get('verification') ?? undefined,
    sort:         params.get('sort')         ?? 'relevance',
  }), [params]);

  const q = params.get('q') ?? '';
  const offset = Number(params.get('offset') ?? 0);

  const setFilters = (next: Filters) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, v); });
    p.delete('offset');
    setParams(p);
  };

  const setOffset = (newOffset: number) => {
    const p = new URLSearchParams(params);
    if (newOffset === 0) p.delete('offset');
    else p.set('offset', String(newOffset));
    setParams(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', filters, q, params.get('raw'), offset],
    queryFn: async () => {
    const raw = params.get('raw') ?? '';
    if (raw && raw.trim()) {
      const res = await fetch('https://havenfinderapi-production.up.railway.app/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: raw, limit: PAGE_SIZE, offset }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Search failed');
      return {
        listings: json.data.listings ?? [],
        total: json.data.total ?? json.data.listings?.length ?? 0,
      };
    }
    return api.listings({ ...filters, q, limit: PAGE_SIZE, offset });
  },
    staleTime: 30_000,
  });

  const mapQuery = useQuery({
    queryKey: ['mapPins', filters, q],
    queryFn: () => api.mapPins({ ...filters, q }),
    enabled: view === 'map' || view === 'split',
    staleTime: 60_000,
  });

  const total = data?.total ?? 0;
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort').length;

  const seoTitle = q ? `Search: ${q}` : filters.country ? `Properties in ${filters.country}` : 'Browse properties';
  const seoDesc = `${total.toLocaleString()} properties available${filters.country ? ` in ${filters.country}` : ''}. Filter by price, bedrooms, type, and location.`;

  return (
    <>
      <Seo title={seoTitle} description={seoDesc} url={window.location.pathname + window.location.search} />

      {/* Sticky results header */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="container-page py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                {q ? `"${q}"` : filters.country ? `Properties in ${filters.country}` : 'Browse properties'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isLoading ? 'Searching…' : `${total.toLocaleString()} propert${total === 1 ? 'y' : 'ies'} found`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile filter trigger */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden btn btn-secondary btn-sm"
              >
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 5 H17 M5 10 H15 M7 15 H13" />
                </svg>
                Filters {activeFilterCount > 0 && <span className="ml-1 text-brand-600 font-semibold">{activeFilterCount}</span>}
              </button>

              {/* Sort */}
              <select
                value={filters.sort ?? 'relevance'}
                onChange={e => setFilters({ ...filters, sort: e.target.value })}
                className="hidden sm:block px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
              >
                <option value="relevance">Recommended</option>
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="views">Most viewed</option>
              </select>

              {/* View toggle */}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-page py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-40">
              <FilterPanel filters={filters} setFilters={setFilters} />
            </div>
          </aside>

          {/* Results */}
          <div>
            {view === 'split' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="max-h-[80vh] overflow-y-auto pr-2 space-y-4">
                  {isLoading && <LoadingState count={4} />}
                  {data?.listings.map(l => <PropertyCard key={l.id} listing={l} />)}
                  {!isLoading && total === 0 && <EmptyState title="No matches" message="Try adjusting your filters." />}
                </div>
                <div className="xl:sticky xl:top-40">
                  {mapQuery.isLoading && <div className="rounded-2xl bg-slate-100 h-[600px] animate-pulse" />}
                  {mapQuery.data && mapQuery.data.pins.length > 0 && <MapView pins={mapQuery.data.pins} height="80vh" />}
                  {mapQuery.data && mapQuery.data.pins.length === 0 && <EmptyState title="No mapped properties" message="Filters returned no listings with coordinates." />}
                </div>
              </div>
            ) : view === 'map' ? (
              <div>
                {mapQuery.isLoading && <div className="rounded-2xl bg-slate-100 h-[70vh] animate-pulse" />}
                {mapQuery.data && (
                  <>
                    {mapQuery.data.capped && (
                      <p className="text-xs text-amber-600 mb-2">Showing first {mapQuery.data.pins.length} pins — narrow your filters to see all.</p>
                    )}
                    <MapView pins={mapQuery.data.pins} height="75vh" />
                  </>
                )}
              </div>
            ) : (
              <>
                {isLoading && <LoadingState />}
                {error && <EmptyState title="Search failed" message={String(error)} />}
                {!isLoading && !error && total === 0 && (
                  <EmptyState title="No properties found" message="Try a different location or clear some filters." />
                )}
                {!isLoading && data && data.listings.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {data.listings.map(l => <PropertyCard key={l.id} listing={l} />)}
                    </div>
                    <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto shadow-2xl">
            <div className="p-6">
              <FilterPanel
                filters={filters}
                setFilters={(f) => { setFilters(f); }}
                onClose={() => setMobileFiltersOpen(false)}
              />
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-6 btn btn-primary btn-lg w-full"
              >
                Show {total.toLocaleString()} results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
