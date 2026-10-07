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
  { value: 'land_sale', label: 'Land sale' },
];

export function FilterPanel({
  filters, setFilters, onClose,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onClose?: () => void;
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

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sort'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
              {activeCount}
            </span>
          )}
        </h3>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        )}
      </div>

      {/* Location */}
      <Group title="Location">
        <select
          value={filters.country ?? ''}
          onChange={e => set('country', e.target.value)}
          className="input"
        >
          <option value="">All countries</option>
          {countries.data?.countries.map(c => (
            <option key={c.code} value={c.code}>
              {c.name || c.code} ({c.count})
            </option>
          ))}
        </select>
      </Group>

      {/* Listing type */}
      <Group title="Listing type">
        <div className="space-y-1">
          {LISTING_TYPES.map(t => (
            <label key={t.value} className="flex items-center gap-2.5 py-1.5 text-sm text-slate-700 cursor-pointer rounded-lg hover:bg-slate-50 px-2 -mx-2 transition-colors">
              <input
                type="radio"
                name="listingType"
                checked={(filters.listingType ?? '') === t.value}
                onChange={() => set('listingType', t.value)}
                className="accent-brand-600 w-4 h-4"
              />
              <span className={filters.listingType === t.value || (!filters.listingType && !t.value) ? 'font-medium text-slate-900' : ''}>
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </Group>

      {/* Property type */}
      <Group title="Property type">
        <select
          value={filters.propertyType ?? ''}
          onChange={e => set('propertyType', e.target.value)}
          className="input"
        >
          <option value="">Any type</option>
          {types.data?.types.map(t => (
            <option key={t.type} value={t.type}>
              {t.type.replace(/_/g, ' ')} ({t.count})
            </option>
          ))}
        </select>
      </Group>

      {/* Bedrooms */}
      <Group title="Bedrooms">
        <div className="grid grid-cols-3 gap-2">
          {['', '1', '2', '3', '4', '5'].map(b => (
            <button
              key={b}
              onClick={() => set('bedrooms', b)}
              className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                (filters.bedrooms ?? '') === b
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/20'
                  : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50/50'
              }`}
            >
              {b === '' ? 'Any' : `${b}+`}
            </button>
          ))}
        </div>
      </Group>

      {/* Max price */}
      <Group title="Max price">
        <select
          value={filters.maxPrice ?? ''}
          onChange={e => set('maxPrice', e.target.value)}
          className="input"
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

      {/* Trust */}
      <Group title="Trust">
        <label className="flex items-center gap-2.5 py-1.5 text-sm text-slate-700 cursor-pointer rounded-lg hover:bg-slate-50 px-2 -mx-2 transition-colors">
          <input
            type="checkbox"
            checked={filters.verification === 'verified'}
            onChange={e => set('verification', e.target.checked ? 'verified' : '')}
            className="accent-brand-600 w-4 h-4"
          />
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-600" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified only
          </span>
        </label>
      </Group>

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={() => setFilters({ sort: filters.sort })}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">{title}</h4>
      {children}
    </div>
  );
}
