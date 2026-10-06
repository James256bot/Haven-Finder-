import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export type Filters = {
  country?: string;
  city?: string;
  listingType?: string;
  propertyType?: string;
  bedrooms?: string;
  minPrice?: string;
  maxPrice?: string;
  verification?: string;
  sort?: string;
};

const LISTING_TYPES = [
  { value: '', label: 'Any' },
  { value: 'rent', label: 'For rent' },
  { value: 'sale', label: 'For sale' },
  { value: 'short_stay', label: 'Short stay' },
  { value: 'commercial_lease', label: 'Commercial lease' },
  { value: 'land_sale', label: 'Land' },
];

const SORTS = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'views', label: 'Most viewed' },
];

export function FilterPanel({
  filters, setFilters,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const countries = useQuery({
    queryKey: ['filter-countries'],
    queryFn: api.countries,
    staleTime: 5 * 60_000,
  });
  const types = useQuery({
    queryKey: ['filter-types'],
    queryFn: api.propertyTypes,
    staleTime: 5 * 60_000,
  });

  const set = (key: keyof Filters, value: string) =>
    setFilters({ ...filters, [key]: value || undefined });

  return (
    <div className="space-y-6">
      <Group title="Location">
        <select
          value={filters.country ?? ''}
          onChange={e => set('country', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">All countries</option>
          {countries.data?.countries.map(c => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
      </Group>

      <Group title="Listing type">
        <div className="space-y-1">
          {LISTING_TYPES.map(t => (
            <label key={t.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="listingType"
                checked={(filters.listingType ?? '') === t.value}
                onChange={() => set('listingType', t.value)}
                className="accent-brand-600"
              />
              {t.label}
            </label>
          ))}
        </div>
      </Group>

      <Group title="Property type">
        <select
          value={filters.propertyType ?? ''}
          onChange={e => set('propertyType', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">Any type</option>
          {types.data?.types.map(t => (
            <option key={t.type} value={t.type}>
              {t.type.replace(/_/g, ' ')} ({t.count})
            </option>
          ))}
        </select>
      </Group>

      <Group title="Bedrooms">
        <div className="flex gap-2">
          {['', '1', '2', '3', '4', '5'].map(b => (
            <button
              key={b}
              onClick={() => set('bedrooms', b)}
              className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                (filters.bedrooms ?? '') === b
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-slate-300 text-slate-700 hover:border-brand-400'
              }`}
            >
              {b === '' ? 'Any' : `${b}+`}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Max price (USD equiv.)">
        <select
          value={filters.maxPrice ?? ''}
          onChange={e => set('maxPrice', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">No limit</option>
          <option value="200">Under $200</option>
          <option value="500">Under $500</option>
          <option value="1000">Under $1,000</option>
          <option value="2000">Under $2,000</option>
          <option value="5000">Under $5,000</option>
          <option value="100000">Under $100,000</option>
          <option value="1000000">Under $1,000,000</option>
        </select>
      </Group>

      <Group title="Trust">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.verification === 'verified'}
            onChange={e => set('verification', e.target.checked ? 'verified' : '')}
            className="accent-brand-600"
          />
          Verified listings only
        </label>
      </Group>

      <button
        onClick={() => setFilters({ sort: filters.sort })}
        className="w-full py-2 rounded-lg text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
