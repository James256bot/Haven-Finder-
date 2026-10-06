import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import { PriceDisplay } from './PriceDisplay';
import { VerificationBadge } from './VerificationBadge';
import { imageSrc } from '../utils/image-url';
import { FavoriteButton } from './FavoriteButton';

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
  farm:       ['#d9f99d', '#365314'],
  default:    ['#e2e8f0', '#475569'],
};

function svgPlaceholder(type?: string | null, label?: string | null) {
  const [bg, fg] = PALETTE[type ?? 'default'] ?? PALETTE.default;
  const text = (type ?? 'property').replace(/_/g, ' ').toUpperCase();
  const sub = (label ?? '').slice(0, 32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${bg}"/><circle cx="400" cy="245" r="60" fill="none" stroke="${fg}" stroke-width="6" opacity="0.35"/><path d="M360 255 L400 220 L440 255 L440 290 L360 290 Z" fill="none" stroke="${fg}" stroke-width="6" opacity="0.5" stroke-linejoin="round"/><text x="400" y="380" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="${fg}" text-anchor="middle">${text}</text><text x="400" y="425" font-family="system-ui,sans-serif" font-size="20" fill="${fg}" text-anchor="middle" opacity="0.75">${sub}</text></svg>`;
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

export function PropertyCard({ listing }: { listing: Listing }) {
  const fallback = svgPlaceholder(listing.property_type, listing.city ?? listing.country);
  const proxied = imageSrc(listing.main_image_url);
  const initial = (shouldUsePlaceholder(listing.main_image_url) || !proxied) ? fallback : proxied;

  return (
    <Link to={`/property/${listing.slug}`} className="group block rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={initial}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => {
            const el = e.currentTarget;
            if (el.src !== fallback && !el.src.startsWith('data:')) {
              el.src = fallback;
            }
          }}
        />
        <div className="absolute top-3 right-3">
          <FavoriteButton listingId={listing.id} variant="overlay" />
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-slate-900 line-clamp-2 text-sm leading-snug">{listing.title}</h3>
          <VerificationBadge state={listing.verification} source={listing.source_code} />
        </div>
        <p className="text-xs text-slate-500">
          {[listing.city, listing.country].filter(Boolean).join(', ') || 'Location not specified'}
        </p>
        <div className="flex items-center justify-between pt-1">
          <PriceDisplay amount={listing.price_amount} currency={listing.currency} period={listing.price_period} />
          <div className="flex gap-3 text-xs text-slate-500">
            {listing.bedrooms != null && listing.bedrooms > 0 && <span>{listing.bedrooms} bd</span>}
            {listing.bathrooms != null && Number(listing.bathrooms) > 0 && <span>{listing.bathrooms} ba</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
