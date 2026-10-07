import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceInput } from '../hooks/useVoiceInput';

const API = 'https://havenfinderapi-production.up.railway.app';

const EXAMPLES = [
  'furnished 2 bedroom apartment in Ntinda under 1.5M',
  '3 bedroom house in Muyenga with parking',
  'student hostel near Makerere',
  'villa in Kololo with pool',
  'office space in Kampala CBD',
  'land for sale in Wakiso',
];

type ParsedQuery = Record<string, any>;

export function SearchBar() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const debounceRef = useRef<number | null>(null);

  // Server-side parse preview (debounced)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.length < 6) { setParsed(null); return; }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/ai/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        });
        const json = await res.json();
        if (json.success) setParsed(json.data.parsed);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q]);

  // Voice input
  const onVoiceFinal = useCallback((text: string) => {
    setQ(text);
    // Auto-submit after a short pause so the user sees the parse before navigating
    setTimeout(() => submitQuery(text), 600);
  }, []);

  const voice = useVoiceInput(onVoiceFinal);

  async function submitQuery(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 24 }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Search failed');

      // Build URL from parsed query so results are shareable
      const p = json.data.parsed as any;
      const params = new URLSearchParams();
      if (p.q)              params.set('q', p.q);
      if (p.propertyType)   params.set('propertyType', p.propertyType);
      if (p.listingType)    params.set('listingType', p.listingType);
      if (p.bedrooms)       params.set('bedrooms', String(p.bedrooms));
      if (p.bathrooms)      params.set('bathrooms', String(p.bathrooms));
      if (p.city)           params.set('city', p.city);
      if (p.neighborhood)   params.set('city', p.neighborhood);
      if (p.country)        params.set('country', p.country);
      if (p.maxPrice)       params.set('maxPrice', String(p.maxPrice));
      if (p.minPrice)       params.set('minPrice', String(p.minPrice));
      if (p.verified)       params.set('verification', 'verified');
      if (p.sortHint === 'price_asc')  params.set('sort', 'price_low');
      if (p.sortHint === 'price_desc') params.set('sort', 'price_high');
      // Store the raw query so /search can display it
      params.set('raw', query);

      nav(`/search?${params.toString()}`);
    } catch (err) {
      nav(`/search?q=${encodeURIComponent(query)}&raw=${encodeURIComponent(query)}`);
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    submitQuery(q);
  }

  const hasSignal = parsed && Object.keys(parsed).some(k =>
    k !== 'q' && k !== 'confidence' && k !== 'parser' && k !== 'language' && parsed[k]
  );

  return (
    <div className="relative">
      <form
        onSubmit={submit}
        className={`relative flex items-center bg-white rounded-2xl p-2 shadow-xl shadow-ink-900/5 ring-1 transition-all duration-200 ${
          focused ? 'ring-brand-400 ring-2' : 'ring-ink-900/5'
        }`}
      >
        <div className="pl-4 pr-3 text-ink-400 flex-shrink-0">
          {loading ? (
            <svg className="w-6 h-6 text-brand-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3 L13.5 9 L19.5 10.5 L13.5 12 L12 18 L10.5 12 L4.5 10.5 L10.5 9 Z" />
            </svg>
          )}
        </div>

        <input
          type="text"
          value={voice.listening ? voice.transcript : q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 250)}
          placeholder={voice.listening ? 'Listening…' : "Try 'furnished 2 bedroom apartment in Ntinda under 1.5M'"}
          className="flex-1 py-3.5 pr-2 outline-none bg-transparent text-ink-900 placeholder:text-ink-400 text-base font-medium"
          readOnly={voice.listening}
        />

        {/* Voice button */}
        {true && (
          <button
            type="button"
            onClick={() => voice.listening ? voice.stop() : voice.start()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              voice.listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-600'
            }`}
            aria-label={voice.listening ? 'Stop voice input' : 'Search by voice'}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11 V12 A7 7 0 0 0 19 12 V11" />
              <path d="M12 19 V22" />
            </svg>
          </button>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-md sm:px-6 sm:py-3.5 text-base flex-shrink-0 ml-1"
        >
          <span className="hidden sm:inline">Search</span>
          <svg viewBox="0 0 20 20" className="sm:hidden w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" />
            <path d="M17 17 L13.5 13.5" />
          </svg>
        </button>
      </form>

      {/* Voice error */}
      {voice.error && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {voice.error}
          </div>
        </div>
      )}

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
              {parsed?.listingType && <Chip label={String(parsed.listingType).replace(/_/g, ' ')} />}
              {parsed?.propertyType && <Chip label={String(parsed.propertyType).replace(/_/g, ' ')} />}
              {parsed?.bedrooms !== undefined && <Chip label={`${parsed.bedrooms} bedrooms`} />}
              {parsed?.bathrooms !== undefined && <Chip label={`${parsed.bathrooms} bathrooms`} />}
              {parsed?.neighborhood && <Chip label={`in ${parsed.neighborhood}`} />}
              {parsed?.city && <Chip label={parsed.city} />}
              {parsed?.country && <Chip label={countryName(parsed.country)} />}
              {parsed?.maxPrice && <Chip label={`under ${formatPrice(parsed.maxPrice)}`} />}
              {parsed?.furnished && <Chip label="furnished" />}
              {parsed?.parking && <Chip label="parking" />}
              {parsed?.pool && <Chip label="pool" />}
              {parsed?.gym && <Chip label="gym" />}
              {parsed?.security && <Chip label="security" />}
              {parsed?.verified && <Chip label="verified only" highlight />}
              {parsed?.nearUniversity && <Chip label={`near ${parsed.nearUniversity}`} />}
              {parsed?.sortHint === 'price_asc' && <Chip label="cheapest first" />}
              {parsed?.sortHint === 'price_desc' && <Chip label="priciest first" />}
            </div>
          </div>
        </div>
      )}

      {/* Examples when empty */}
      {focused && !q && !voice.listening && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-ink-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
              Type, tap the mic, or try:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setQ(ex); }}
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
