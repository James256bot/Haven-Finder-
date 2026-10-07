import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseNaturalLanguage } from '../utils/nlSearch';

const EXAMPLES = [
  'furnished 2 bedroom apartment in Ntinda under 1.5 million',
  '3 bedroom house in Muyenga with parking',
  'student hostel near Makerere',
  'verified land for sale in Wakiso',
  'office space in Kampala CBD',
  'villa for rent in Kololo',
];

export function SearchBar() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [parsed, setParsed] = useState<ReturnType<typeof parseNaturalLanguage> | null>(null);
  const nav = useNavigate();

  function liveParse(value: string) {
    setQ(value);
    if (value.length >= 8) {
      setParsed(parseNaturalLanguage(value));
    } else {
      setParsed(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseNaturalLanguage(q);
    const params = new URLSearchParams();
    if (p.q) params.set('q', p.q);
    if (p.propertyType) params.set('propertyType', p.propertyType);
    if (p.listingType) params.set('listingType', p.listingType);
    if (p.bedrooms) params.set('bedrooms', String(p.bedrooms));
    if (p.bathrooms) params.set('bathrooms', String(p.bathrooms));
    if (p.city) params.set('city', p.city);
    if (p.country) params.set('country', p.country);
    if (p.maxPrice) params.set('maxPrice', String(p.maxPrice));
    if (p.minPrice) params.set('minPrice', String(p.minPrice));
    if (p.verified) params.set('verification', 'verified');
    nav(`/search?${params.toString()}`);
  }

  const hasSignal =
    parsed &&
    (parsed.propertyType || parsed.listingType || parsed.bedrooms || parsed.city ||
     parsed.maxPrice || parsed.furnished || parsed.verified || parsed.parking ||
     parsed.pool || parsed.gym || parsed.aircon || parsed.garden || parsed.security ||
     parsed.nearUniversity);

  return (
    <div className="relative">
      <form
        onSubmit={submit}
        className={`relative flex items-center bg-white rounded-2xl p-2 shadow-xl shadow-ink-900/5 ring-1 transition-all duration-200 ${
          focused ? 'ring-brand-400 ring-2' : 'ring-ink-900/5'
        }`}
      >
        <div className="pl-4 pr-3 text-ink-400 flex-shrink-0">
          {focused ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 L13.5 9 L19.5 10.5 L13.5 12 L12 18 L10.5 12 L4.5 10.5 L10.5 9 Z" />
              <circle cx="19" cy="5" r="1" fill="currentColor" />
              <circle cx="5" cy="19" r="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21 L16.5 16.5" />
            </svg>
          )}
        </div>

        <input
          type="text"
          value={q}
          onChange={e => liveParse(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Try 'furnished 2 bedroom apartment in Ntinda under 1.5M'"
          className="flex-1 py-3.5 pr-3 outline-none bg-transparent text-ink-900 placeholder:text-ink-400 text-base font-medium"
        />

        <button
          type="submit"
          className="btn btn-primary btn-md sm:px-6 sm:py-3.5 text-base flex-shrink-0"
        >
          <span className="hidden sm:inline">Search</span>
          <svg viewBox="0 0 20 20" className="sm:hidden w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" />
            <path d="M17 17 L13.5 13.5" />
          </svg>
        </button>
      </form>

      {/* Live parse preview */}
      {focused && hasSignal && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-ink-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 L13.5 9 L19.5 10.5 L13.5 12 L12 18 L10.5 12 L4.5 10.5 L10.5 9 Z" />
                </svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                AI understood
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {parsed.listingType && <Chip label={parsed.listingType.replace(/_/g, ' ')} />}
              {parsed.propertyType && <Chip label={parsed.propertyType.replace(/_/g, ' ')} />}
              {parsed.bedrooms !== undefined && <Chip label={`${parsed.bedrooms} bedrooms`} />}
              {parsed.bathrooms !== undefined && <Chip label={`${parsed.bathrooms} bathrooms`} />}
              {parsed.city && <Chip label={`in ${parsed.city}`} />}
              {parsed.country && <Chip label={countryName(parsed.country)} />}
              {parsed.maxPrice && <Chip label={`under ${formatPrice(parsed.maxPrice)}`} />}
              {parsed.furnished && <Chip label="furnished" />}
              {parsed.parking && <Chip label="parking" />}
              {parsed.pool && <Chip label="pool" />}
              {parsed.gym && <Chip label="gym" />}
              {parsed.aircon && <Chip label="air conditioning" />}
              {parsed.garden && <Chip label="garden" />}
              {parsed.security && <Chip label="security" />}
              {parsed.verified && <Chip label="verified only" highlight />}
              {parsed.nearUniversity && <Chip label={`near ${parsed.nearUniversity}`} />}
            </div>
          </div>
        </div>
      )}

      {/* Example chips when empty */}
      {focused && !q && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-ink-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
              Try asking naturally
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setQ(ex); liveParse(ex); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-ink-50 hover:bg-brand-50 hover:text-brand-700 text-ink-600 transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      highlight
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
    }`}>
      {highlight && (
        <svg viewBox="0 0 20 20" className="w-3 h-3" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      {label}
    </span>
  );
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function countryName(code: string) {
  const names: Record<string, string> = {
    UG: 'Uganda', KE: 'Kenya', NG: 'Nigeria', ZA: 'South Africa',
    TZ: 'Tanzania', US: 'United States',
  };
  return names[code] ?? code;
}
