import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { SearchBar } from '../components/SearchBar';
import { Seo } from '../components/Seo';
import { PropertyCard } from '../components/PropertyCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';

const POPULAR = ['Kampala', 'Kololo', 'Ntinda', 'Kisaasi', 'Naguru', 'Muyenga', 'Nairobi', 'Lagos'];

export function HomePage() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats });
  const featured = useQuery({
    queryKey: ['listings', 'home'],
    queryFn: () => api.listings({ limit: 8 }),
  });

  return (
    <div>
      <Seo
        title="Find Your Haven"
        description="1,150+ real properties across Uganda, Kenya, Nigeria, and beyond. Houses, apartments, land, and commercial spaces — with real photos and real prices."
        url="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': 'HavenFinder',
          'url': 'https://havenfinder.com',
          'potentialAction': {
            '@type': 'SearchAction',
            'target': 'https://havenfinder.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 text-center">
            Find Your Haven.
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-slate-600 text-center max-w-2xl mx-auto">
            Discover trusted homes, stays, spaces and properties across Uganda and beyond.
          </p>
          <div className="mt-10 max-w-3xl mx-auto">
            <SearchBar />
          </div>
          {stats.data && (
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-500">
              <span><strong className="text-slate-900">{Number(stats.data.published).toLocaleString()}</strong> listings</span>
              <span><strong className="text-slate-900">{stats.data.countries}</strong> countries</span>
              <span><strong className="text-slate-900">{stats.data.cities}</strong> cities</span>
            </div>
          )}
        </div>
      </section>

      {/* Popular locations */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">Popular locations</h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map(p => (
            <Link
              key={p}
              to={`/search?q=${encodeURIComponent(p)}`}
              className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm text-slate-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
            >
              {p}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Featured properties</h2>
            <p className="text-slate-500 text-sm mt-1">Freshly listed and ready to view</p>
          </div>
          <Link to="/search" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
        </div>

        {featured.isLoading && <LoadingState />}
        {featured.isError && (
          <EmptyState title="Couldn't load listings" message={String(featured.error)} />
        )}
        {featured.data && featured.data.listings.length === 0 && (
          <EmptyState title="No listings yet" message="Check back soon — owners are adding properties daily." />
        )}
        {featured.data && featured.data.listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.data.listings.map(l => <PropertyCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">Have a property to rent or sell?</h2>
          <p className="text-slate-300 mt-3 max-w-xl mx-auto">
            List it on HavenFinder and reach thousands of verified renters and buyers.
          </p>
          <Link
            to="/list"
            className="inline-block mt-6 px-6 py-3 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-100"
          >
            List your property
          </Link>
        </div>
      </section>
    </div>
  );
}
