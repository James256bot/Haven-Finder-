import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { PriceDisplay } from '../components/PriceDisplay';
import { VerificationBadge } from '../components/VerificationBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { imageSrc } from '../utils/image-url';
import { ViewingForm } from '../components/ViewingForm';
import { Seo } from '../components/Seo';
import { MessageOwnerButton } from '../components/MessageOwnerButton';
import { FavoriteButton } from '../components/FavoriteButton';

const PALETTE: Record<string, [string, string]> = {
  apartment:  ['#dbeafe', '#1e40af'],
  house:      ['#dcfce7', '#166534'],
  villa:      ['#fef3c7', '#92400e'],
  condo:      ['#e0e7ff', '#3730a3'],
  studio:     ['#fce7f3', '#9d174d'],
  room:       ['#fef9c3', '#854d0e'],
  hostel:     ['#ede9fe', '#5b21b6'],
  guest_house:['#cffafe', '#155e75'],
  office:     ['#f3e8ff', '#6b21a8'],
  shop:       ['#fee2e2', '#991b1b'],
  land:       ['#ecfccb', '#3f6212'],
  default:    ['#e2e8f0', '#475569'],
};

function svgPlaceholder(type?: string | null, label?: string | null) {
  const [bg, fg] = PALETTE[type ?? 'default'] ?? PALETTE.default;
  const text = (type ?? 'property').replace(/_/g, ' ').toUpperCase();
  const sub = (label ?? '').slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/><circle cx="600" cy="320" r="90" fill="none" stroke="${fg}" stroke-width="8" opacity="0.35"/><path d="M540 340 L600 290 L660 340 L660 390 L540 390 Z" fill="none" stroke="${fg}" stroke-width="8" opacity="0.5" stroke-linejoin="round"/><text x="600" y="530" font-family="system-ui,sans-serif" font-size="52" font-weight="700" fill="${fg}" text-anchor="middle">${text}</text><text x="600" y="590" font-family="system-ui,sans-serif" font-size="28" fill="${fg}" text-anchor="middle" opacity="0.75">${sub}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function shouldUsePlaceholder(url?: string | null) {
  if (!url) return true;
  if (url.includes('picsum.photos')) return true;
  if (url.includes('placehold.co')) return true;
  if (url.includes('placeholder')) return true;
  if (url.includes('untera.io') && !url.includes('/images/')) return true;
  return false;
}

export function PropertyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['listing', slug],
    queryFn: () => api.listing(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <div className="max-w-5xl mx-auto px-4 py-10"><LoadingState count={2} /></div>;
  if (error || !data) return <div className="max-w-5xl mx-auto px-4 py-10"><EmptyState title="Property not found" message={String(error ?? '')} /></div>;

  const l = data.listing;
  const fallback = svgPlaceholder(l.property_type, l.city ?? l.country);
  const proxied = imageSrc(l.main_image_url);
  const initial = (shouldUsePlaceholder(l.main_image_url) || !proxied) ? fallback : proxied;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Seo
        title={l.title}
        description={
          [
            l.bedrooms ? `${l.bedrooms} bedroom` : '',
            l.bathrooms ? `${Number(l.bathrooms)} bathroom` : '',
            l.property_type ?? 'property',
            l.listing_type === 'rent' ? 'for rent' : l.listing_type === 'sale' ? 'for sale' : '',
            'in',
            [l.city, l.country].filter(Boolean).join(', '),
          ].filter(Boolean).join(' ') + `. ${l.currency} ${Number(l.price_amount ?? 0).toLocaleString()}.`
        }
        image={l.main_image_url ?? undefined}
        url={`/property/${l.slug}`}
        type="product"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          'name': l.title,
          'description': l.description ?? '',
          'url': `https://havenfinder.com/property/${l.slug}`,
          'image': l.main_image_url ?? undefined,
          'datePosted': l.created_at,
          'address': {
            '@type': 'PostalAddress',
            'addressLocality': l.city ?? 'Kampala',
            'addressCountry': l.country_code ?? 'UG',
          },
          'geo': l.latitude && l.longitude ? {
            '@type': 'GeoCoordinates',
            'latitude': Number(l.latitude),
            'longitude': Number(l.longitude),
          } : undefined,
          'offers': {
            '@type': 'Offer',
            'price': l.price_amount,
            'priceCurrency': l.currency,
            'availability': 'https://schema.org/InStock',
          },
          'numberOfBedrooms': l.bedrooms ?? undefined,
          'numberOfBathroomsTotal': l.bathrooms ? Number(l.bathrooms) : undefined,
        }}
      />
      <Link to="/search" className="text-sm text-brand-600 hover:text-brand-700">← Back to search</Link>

      <div className="mt-4 rounded-2xl overflow-hidden bg-slate-100 aspect-[16/10]">
        <img
          src={initial}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={e => {
            const el = e.currentTarget;
            if (el.src !== fallback && !el.src.startsWith('data:')) {
              el.src = fallback;
            }
          }}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h1 className="text-3xl font-semibold text-slate-900">{l.title}</h1>
              <VerificationBadge state={l.verification} source={l.source_code} />
            </div>
            <p className="text-slate-500 mt-2">
              {[l.city, l.country].filter(Boolean).join(', ')}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 py-5 border-y border-slate-200">
            {l.bedrooms != null && l.bedrooms > 0 && <Stat label="Bedrooms" value={l.bedrooms} />}
            {l.bathrooms != null && Number(l.bathrooms) > 0 && <Stat label="Bathrooms" value={l.bathrooms} />}
            {l.property_type && <Stat label="Type" value={l.property_type} />}
            {l.listing_type && <Stat label="Listing" value={l.listing_type} />}
          </div>

          {l.description && (
            <div>
              <h2 className="font-semibold text-slate-900 mb-2">About this property</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>
          )}

          {l.source_code && (
            <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
              Data source:{' '}
              <a href={l.source_url ?? '#'} className="underline" target="_blank" rel="noreferrer">{l.source_code}</a>
              {' · '}
              <a href="https://untera.io" className="underline" target="_blank" rel="noreferrer">Powered by Untera</a>
            </p>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 sticky top-24">
            <div className="text-2xl">
              <PriceDisplay amount={l.price_amount} currency={l.currency} period={l.price_period} />
            </div>
            <div className="mt-6 space-y-3">
              <MessageOwnerButton listingId={l.id} listingTitle={l.title} />
              <ViewingForm listingId={l.id} listingTitle={l.title} />
              <FavoriteButton listingId={l.id} variant="inline" />
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Contact details are shared after your request is approved.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-900 font-medium mt-0.5">{value}</div>
    </div>
  );
}
