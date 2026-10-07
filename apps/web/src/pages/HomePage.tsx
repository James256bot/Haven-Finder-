import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { SearchBar } from '../components/SearchBar';
import { PropertyCard } from '../components/PropertyCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Seo } from '../components/Seo';

const POPULAR = ['Kampala', 'Kololo', 'Ntinda', 'Kisaasi', 'Naguru', 'Muyenga', 'Nairobi', 'Lagos'];

const PROPERTY_TYPES = [
  { slug: 'apartment', label: 'Apartments', icon: '🏢' },
  { slug: 'house',     label: 'Houses',     icon: '🏠' },
  { slug: 'villa',     label: 'Villas',     icon: '🏛' },
  { slug: 'studio',    label: 'Studios',    icon: '🛏' },
  { slug: 'land',      label: 'Land',       icon: '🌳' },
  { slug: 'office',    label: 'Offices',    icon: '💼' },
];

export function HomePage() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  const featured = useQuery({ queryKey: ['listings', 'home'], queryFn: () => api.listings({ limit: 8 }) });

  return (
    <div>
      <Seo title="Find Your Haven" description="1,000+ real properties across Uganda, Kenya, Nigeria, and beyond. Houses, apartments, land, and commercial spaces — with real photos and real prices." url="/" />

      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white animate-fade-in">
        <div className="absolute inset-x-0 -top-40 -z-10 blur-3xl opacity-20">
          <div className="relative left-1/2 aspect-[1155/678] w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-brand-200 to-brand-500" />
        </div>

        <div className="container-page pt-24 pb-28 sm:pt-32 sm:pb-36">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-brand-200 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-soft mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live listings across 10 countries
            </div>

            <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl xl:text-[6rem] font-extrabold tracking-[-0.03em] leading-[1.02] text-ink-900 animate-slide-up">
              Find Your <span className="text-brand-600 relative inline-block">Haven<span className="absolute -bottom-1 left-0 right-0 h-1.5 sm:h-2 bg-brand-200 rounded-full -z-10" /></span>.
            </h1>
            <p className="mt-8 text-xl sm:text-2xl lg:text-3xl text-ink-500 max-w-2xl mx-auto leading-relaxed font-medium animate-slide-up">
              Discover trusted homes, stays, spaces and properties across Uganda and beyond.
            </p>

            <div className="mt-12 max-w-3xl mx-auto"><SearchBar /></div>
            <div className="mt-6 flex justify-center">
              <Link to="/map" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4 L3 6 V20 L9 18 L15 20 L21 18 V4 L15 6 Z M9 4 V18 M15 6 V20" />
                </svg>
                Explore on the map
              </Link>
            </div>

            {stats.data && (
              <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm">
                <Stat value={Number(stats.data.published).toLocaleString()} label="listings" />
                <Stat value={stats.data.countries} label="countries" />
                <Stat value={stats.data.cities} label="cities" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500 mr-2">Popular:</span>
          {POPULAR.map(p => (
            <Link key={p} to={`/search?q=${encodeURIComponent(p)}`}
              className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700 hover:shadow-sm transition-all">
              {p}
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">Featured properties</h2>
            <p className="text-slate-500 text-sm mt-1.5">Freshly listed and ready to view</p>
          </div>
          <Link to="/search" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all →</Link>
        </div>

        {featured.isLoading && <LoadingState />}
        {featured.isError && <EmptyState title="Couldn't load listings" message={String(featured.error)} />}
        {featured.data && featured.data.listings.length === 0 && <EmptyState title="No listings yet" message="Check back soon." />}
        {featured.data && featured.data.listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {featured.data.listings.map(l => <PropertyCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>

      <section className="container-page py-12">
        <h2 className="h2 text-slate-900 mb-8">Browse by property type</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PROPERTY_TYPES.map(t => (
            <Link key={t.slug} to={`/search?propertyType=${t.slug}`} className="card card-hover p-5 text-center">
              <div className="text-3xl mb-2">{t.icon}</div>
              <div className="text-sm font-medium text-slate-700">{t.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900">Why HavenFinder</h2>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">Building the most trusted property platform in East Africa.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          <Feature icon="shield" title="Verified listings" text="Every listing is reviewed. Badges tell you exactly what's verified." />
          <Feature icon="search" title="Powerful search" text="Find the right property by location, price, size, and 20+ filters." />
          <Feature icon="users"  title="Trusted agents" text="Real agents with real reviews. No middlemen, no surprises." />
          <Feature icon="calendar" title="Easy viewings" text="Book a viewing in one tap. Get confirmation on WhatsApp." />
        </div>
      </section>

      <section className="container-page py-16">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 sm:p-16">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Have a property to rent or sell?</h2>
            <p className="text-slate-300 mt-4 text-lg">List it on HavenFinder and reach thousands of verified renters and buyers across Uganda.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/list" className="btn btn-lg bg-white text-slate-900 hover:bg-slate-100">List your property</Link>
              <Link to="/pricing" className="btn btn-lg bg-white/10 text-white border border-white/20 hover:bg-white/20">See pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-4xl sm:text-5xl font-extrabold text-ink-900 font-display tracking-tight">{value}</span>
      <span className="text-ink-500 text-sm sm:text-base font-semibold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  const icons: Record<string, JSX.Element> = {
    shield:   <path d="M12 2 L20 6 V12 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 12 V6 Z" />,
    search:   <><circle cx="11" cy="11" r="7" /><path d="M21 21 L16.5 16.5" /></>,
    users:    <><circle cx="9" cy="8" r="3.5" /><path d="M3 20 C3 16 6 14 9 14 C12 14 15 16 15 20 M17 11 C19 11 21 13 21 16" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10 H21 M8 3 V7 M16 3 V7" /></>,
  };
  return (
    <div className="card p-6">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center mb-5 shadow-soft">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icons[icon]}
        </svg>
      </div>
      <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}
