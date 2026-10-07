import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import { PriceDisplay } from './PriceDisplay';
import { VerificationBadge } from './VerificationBadge';
import { FavoriteButton } from './FavoriteButton';

const API = 'https://havenfinderapi-production.up.railway.app';

function resolveImage(raw?: string | null): string {
  if (!raw) return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#e2e8f0"/><text x="400" y="300" font-family="system-ui" font-size="32" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">No image</text></svg>'
  );

  // Jiji images — proxy through our API
  if (raw.includes('jijistatic.com')) {
    return `${API}/img?url=${encodeURIComponent(raw)}`;
  }

  // Untera images — proxy through our API
  if (raw.includes('untera.io') || raw.includes('untera-images')) {
    return `${API}/img?url=${encodeURIComponent(raw)}`;
  }

  // Already a data URI or local path
  if (raw.startsWith('data:') || raw.startsWith('/uploads/')) {
    if (raw.startsWith('/uploads/')) {
      return `${API}${raw}`;
    }
    return raw;
  }

  // Anything else — return as-is
  return raw;
}

function specs(b: number | null | undefined, ba: number | null | undefined) {
  const parts: string[] = [];
  if (b && b > 0) parts.push(`${b} bd`);
  if (ba && Number(ba) > 0) parts.push(`${Number(ba)} ba`);
  return parts.join(' · ');
}

export function PropertyCard({ listing }: { listing: Listing }) {
  const imgUrl = resolveImage(listing.main_image_url);

  return (
    <Link to={`/property/${listing.slug}`} className="group block card card-hover overflow-hidden">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={imgUrl}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <VerificationBadge state={listing.verification} source={listing.source_code} />
        </div>
        <div className="absolute top-3 right-3">
          <FavoriteButton listingId={listing.id} variant="overlay" />
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <h3 className="font-semibold text-ink-900 text-[15px] leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {listing.title}
        </h3>
        <p className="text-xs text-ink-500 flex items-center gap-1.5">
          {[listing.city, listing.country].filter(Boolean).join(', ') || 'Location not specified'}
        </p>
        <div className="flex items-end justify-between pt-1.5">
          <PriceDisplay amount={listing.price_amount} currency={listing.currency} period={listing.price_period} />
          {specs(listing.bedrooms, listing.bathrooms) && (
            <span className="text-[11px] text-ink-600 font-semibold bg-ink-100 rounded-full px-2 py-0.5">
              {specs(listing.bedrooms, listing.bathrooms)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
