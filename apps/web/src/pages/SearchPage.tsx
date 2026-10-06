import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../services/api';
import { PropertyCard } from '../components/PropertyCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { FilterPanel, type Filters } from '../components/FilterPanel';
import { Pagination } from '../components/Pagination';
import { Seo } from '../components/Seo';

const PAGE_SIZE = 24;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
    queryKey: ['search', filters, q, offset],
    queryFn: () => api.listings({ ...filters, q, limit: PAGE_SIZE, offset }),
    staleTime: 30_000,
  });

  const total = data?.total ?? 0;

  const seoTitle = q ? `Search: ${q}` : filters.country ? `Properties in ${filters.country}` : 'Browse properties';
  const seoDesc = `${total.toLocaleString()} properties available${filters.country ? ` in ${filters.country}` : ''}. Filter by price, bedrooms, type, and location.`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Seo title={seoTitle} description={seoDesc} url={window.location.pathname + window.location.search} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {q ? `Results for "${q}"` : 'Browse properties'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isLoading ? 'Searching…' : `${total.toLocaleString()} propert${total === 1 ? 'y' : 'ies'} found`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FilterPanel filters={filters} setFilters={setFilters} />
          </div>
        </aside>

        {/* Mobile filter button */}
        <div className="lg:hidden">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium"
          >
            Filters {Object.values(filters).filter(v => v && v !== 'relevance').length > 0 && '•'}
          </button>
        </div>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <select
              value={filters.sort ?? 'relevance'}
              onChange={e => setFilters({ ...filters, sort: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="relevance">Recommended</option>
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="views">Most viewed</option>
            </select>
          </div>

          {isLoading && <LoadingState />}
          {error && <EmptyState title="Search failed" message={String(error)} />}
          {!isLoading && !error && total === 0 && (
            <EmptyState title="No matches" message="Try adjusting your filters or search terms." />
          )}
          {!isLoading && data && data.listings.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {data.listings.map(l => <PropertyCard key={l.id} listing={l} />)}
              </div>
              <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-slate-900">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            <FilterPanel filters={filters} setFilters={setFilters} />
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full py-3 rounded-xl bg-brand-600 text-white font-medium"
            >
              Show {total} results
            </button>
          </div>
        </div>
      )}

      <div className="mt-10">
        <Link to="/" className="text-sm text-brand-600 hover:text-brand-700">← Back to home</Link>
      </div>
    </div>
  );
}
