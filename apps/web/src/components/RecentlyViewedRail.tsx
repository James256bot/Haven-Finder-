import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentlyViewed, clearRecentlyViewed, type RecentItem } from '../hooks/useRecentlyViewed';
import { PriceDisplay } from './PriceDisplay';
import { imageSrc } from '../utils/image-url';

export function RecentlyViewedRail() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="container-page py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recently viewed</h2>
        <button
          onClick={() => { clearRecentlyViewed(); setItems([]); }}
          className="text-xs text-slate-500 hover:text-red-600"
        >
          Clear
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {items.map(item => (
          <Link
            key={item.id}
            to={`/listing/${item.slug}`}
            className="flex-shrink-0 w-56 snap-start rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-[4/3] bg-slate-100 relative">
              {item.main_image_url ? (
                <img
                  src={imageSrc(item.main_image_url)}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl">🏠</div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {[item.city, item.country].filter(Boolean).join(', ')}
              </p>
              <p className="text-sm font-bold text-brand-600 mt-2">
                <PriceDisplay amount={item.price_amount} currency={item.currency} period={item.price_period} />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
