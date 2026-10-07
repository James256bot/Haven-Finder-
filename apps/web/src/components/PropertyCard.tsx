import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import { PriceDisplay } from './PriceDisplay';
import { VerificationBadge } from './VerificationBadge';
import { imageSrc } from '../utils/image-url';
import { FavoriteButton } from './FavoriteButton';

const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f1f5f9"/><text x="400" y="300" font-family="system-ui" font-size="32" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">No image</text></svg>`
);

function specs(b: number | null | undefined, ba: number | null | undefined) {
  const parts: string[] = [];
  if (b && b > 0) parts.push(`${b} bd`);
  if (ba && Number(ba) > 0) parts.push(`${Number(ba)} ba`);
  return parts.join(' · ');
}

export function PropertyCard({ listing }: { listing: Listing }) {
  const src = imageSrc(listing.main_image_url) || FALLBACK;

  return (
    <Link to={`/property/${listing.slug}`} className="group block card card-hover overflow-hidden animate-slide-up">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={e => { const el = e.currentTarget; if (el.src !== FALLBACK) el.src = FALLBACK; }} />
        <div className="absolute top-3 left-3"><VerificationBadge state={listing.verification} source={listing.source_code} /></div>
        <div className="absolute top-3 right-3"><FavoriteButton listingId={listing.id} variant="overlay" /></div>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="font-semibold text-ink-900 text-lg leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {listing.title}
        </h3>
        <p className="text-sm text-ink-500 flex items-center gap-1.5">
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2 C6.5 2 4 4.5 4 8 C4 12 10 18 10 18 C10 18 16 12 16 8 C16 4.5 13.5 2 10 2 Z" />
            <circle cx="10" cy="8" r="2" />
          </svg>
          {[listing.city, listing.country].filter(Boolean).join(', ') || 'Location not specified'}
        </p>
        <div className="flex items-end justify-between pt-1.5">
          <PriceDisplay amount={listing.price_amount} currency={listing.currency} period={listing.price_period} />
          {specs(listing.bedrooms, listing.bathrooms) && <span className="text-xs text-ink-600 font-semibold bg-ink-100 rounded-full px-2 py-0.5">{specs(listing.bedrooms, listing.bathrooms)}</span>}
        </div>
      </div>
    </Link>
  );
}
