import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PropertyCard } from '../components/PropertyCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import type { Listing } from '../types';

export function FavoritesPage() {
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { nav('/login'); return; }

    fetch('/api/me/favorites', { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => {
        if (!j.success) throw new Error(j.error?.message ?? 'Failed');
        setItems(j.data.favorites);
      })
      .catch(e => setError(e.message));
  }, [nav]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Saved properties</h1>
        <p className="text-slate-500 text-sm mt-1">
          {items ? `${items.length} saved` : 'Loading…'}
        </p>
      </div>

      {error && <EmptyState title="Could not load" message={error} />}
      {!items && !error && <LoadingState />}
      {items && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">♡</div>
          <p className="text-slate-700 font-medium">No saved properties yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Tap the heart on any property to save it for later.
          </p>
          <button
            onClick={() => nav('/search')}
            className="inline-block mt-6 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium"
          >
            Browse properties
          </button>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(l => <PropertyCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
