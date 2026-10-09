import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { PriceDisplay } from '../components/PriceDisplay';
import { VerificationBadge } from '../components/VerificationBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ViewingForm } from '../components/ViewingForm';
import { MessageOwnerButton } from '../components/MessageOwnerButton';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { FavoriteButton } from '../components/FavoriteButton';
import { Seo } from '../components/Seo';
import { TrustBadge } from '../components/TrustBadge';
import { ReportButton } from '../components/ReportButton';

const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#e2e8f0"/><text x="600" y="400" font-family="system-ui" font-size="48" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">No image</text></svg>`
);

function resolveImage(raw?: string | null): string {
  if (!raw) return FALLBACK;
  // Jiji images serve fine directly — skip the proxy
  if (raw.includes('jijistatic.com')) return raw;
  // Untera images need the proxy
  if (raw.includes('untera.io') || raw.includes('untera-images')) {
    return `https://havenfinderapi-production.up.railway.app/img?url=${encodeURIComponent(raw)}`;
  }
  if (raw.startsWith('/uploads/')) return `https://havenfinderapi-production.up.railway.app${raw}`;
  return raw;
}


function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <span className="text-slate-700 font-semibold text-sm">{value}</span>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export function PropertyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['listing', slug],
    queryFn: () => api.listing(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <div className="container-page py-10"><LoadingState count={2} /></div>;
  if (error || !data) return <div className="container-page py-10"><EmptyState title="Property not found" message={String(error ?? '')} /></div>;

  const l = data.listing;
  const src = resolveImage(l.main_image_url) || FALLBACK;
  const location = [l.city, l.country].filter(Boolean).join(', ') || 'Location not specified';
  const action = l.listing_type === 'rent' ? 'For rent'
    : l.listing_type === 'sale' ? 'For sale'
    : l.listing_type === 'short_stay' ? 'Short stay'
    : l.listing_type === 'land_sale' ? 'Land for sale'
    : l.listing_type === 'commercial_lease' ? 'Commercial lease'
    : '';

  return (
    <>
      <Seo
        title={l.title}
        description={
          [
            l.bedrooms ? `${l.bedrooms} bedroom` : '',
            l.bathrooms ? `${Number(l.bathrooms)} bathroom` : '',
            l.property_type ?? 'property',
            l.listing_type === 'rent' ? 'for rent' : l.listing_type === 'sale' ? 'for sale' : '',
            'in',
            location,
          ].filter(Boolean).join(' ') + `. ${l.currency} ${Number(l.price_amount ?? 0).toLocaleString()}.`
        }
        image={l.main_image_url ?? undefined}
        url={`/property/${l.slug}`}
        type="product"
      />

      <div className="container-page py-6 sm:py-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-5">
          <Link to="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link to="/search" className="hover:text-slate-900">Properties</Link>
          {l.city && <><span>/</span><span className="text-slate-700">{l.city}</span></>}
        </nav>

        {/* ─── Hero image ─────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-100 aspect-[16/10] sm:aspect-[16/8]">
          <img
            src={src}
            alt={l.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={e => { const el = e.currentTarget; if (el.src !== FALLBACK) el.src = FALLBACK; }}
          />

          {/* Overlay: badges */}
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <VerificationBadge state={l.verification} source={l.source_code} />
            {action && (
              <span className="badge bg-slate-900/90 text-white backdrop-blur">
                {action}
              </span>
            )}
          </div>

          {/* Overlay: save button */}
          <div className="absolute top-4 right-4">
            <FavoriteButton listingId={l.id} variant="overlay" size="lg" />
          </div>
        </div>

        {/* ─── Content grid ──────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title block */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                {l.title}
              </h1>
              <div className="mt-4"><TrustBadge trust={(data as any).trust} /></div>
              <p className="text-slate-500 mt-3 flex items-center gap-2 text-base">
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2 C6.5 2 4 4.5 4 8 C4 12 10 18 10 18 C10 18 16 12 16 8 C16 4.5 13.5 2 10 2 Z" />
                  <circle cx="10" cy="8" r="2" />
                </svg>
                {location}
              </p>
            </div>

            {/* Quick specs */}
            <div className="card p-5 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {l.bedrooms != null && l.bedrooms > 0 && <Stat label="Bedrooms" value={l.bedrooms} />}
                {l.bathrooms != null && Number(l.bathrooms) > 0 && <Stat label="Bathrooms" value={Number(l.bathrooms)} />}
                {l.property_type && <Stat label="Type" value={String(l.property_type).replace(/_/g, ' ')} />}
                {l.floor_area_sqm && <Stat label="Floor area" value={`${Math.round(Number(l.floor_area_sqm))} m²`} />}
              </div>
            </div>

            {/* Description */}
            {l.description && (
              <div>
                <h2 className="h3 text-slate-900 mb-3">About this property</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{l.description}</p>
              </div>
            )}

            {/* Map placeholder / location block */}
            <div>
              <h2 className="h3 text-slate-900 mb-3">Location</h2>
              <div className="card overflow-hidden">
                <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-3">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2 Z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{location}</p>
                    <p className="text-xs text-slate-500 mt-1">Exact address shared after viewing is confirmed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Source attribution */}
            {l.source_code && (
              <div className="text-xs text-slate-400 pt-4 border-t border-slate-200">
                Data source: <a href={l.source_url ?? '#'} className="underline hover:text-slate-600" target="_blank" rel="noreferrer">{l.source_code}</a>
                {l.source_code === 'untera' && <> · <a href="https://untera.io" className="underline hover:text-slate-600" target="_blank" rel="noreferrer">Powered by Untera</a></>}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Price card */}
              <div className="card p-6">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Price</p>
                <div className="text-3xl font-bold text-slate-900">
                  <PriceDisplay amount={l.price_amount} currency={l.currency} period={l.price_period} />
                </div>

                <div className="mt-6 space-y-3">
                  {console.log('PHONE DEBUG:', l.owner_phone, '| title:', l.title)}
                  <WhatsAppButton
                    phone={l.owner_phone}
                    listingTitle={l.title}
                    listingSlug={l.slug}
                    city={l.city}
                  />
                  <MessageOwnerButton listingId={l.id} listingTitle={l.title} />
                  <ViewingForm listingId={l.id} listingTitle={l.title} />
                </div>

                <p className="text-xs text-slate-400 mt-4 text-center leading-relaxed">
                  </p>
                <div className="mt-4 text-center"><ReportButton listingId={l.id} /></div>
                <p className="text-xs text-ink-400 mt-4 text-center leading-relaxed">Contact details are shared after your request is approved.
                </p>
              </div>

              {/* Trust card */}
              <div className="card p-5 bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-600" fill="currentColor">
                      <path fillRule="evenodd" d="M10 1l7 3v6c0 4.42-2.99 8.36-7 9.5C5.99 18.36 3 14.42 3 10V4l7-3zm3.7 7.7a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">Your safety matters</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Never send money before viewing. Report suspicious listings immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
