import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PriceDisplay } from '../components/PriceDisplay';
import { EmptyState } from '../components/EmptyState';

type Viewing = {
  id: string;
  status: string;
  preferred_date: string;
  preferred_time: string;
  message: string | null;
  owner_note: string | null;
  created_at: string;
  listing_id: string;
  slug: string;
  title: string;
  city: string | null;
  country: string | null;
  main_image_url: string | null;
  price_amount: string | null;
  currency: string | null;
  price_period: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700',
  confirmed:   'bg-emerald-50 text-emerald-700',
  rescheduled: 'bg-sky-50 text-sky-700',
  rejected:    'bg-red-50 text-red-700',
  completed:   'bg-slate-100 text-slate-600',
  cancelled:   'bg-slate-100 text-slate-600',
};

export function DashboardPage() {
  const [viewings, setViewings] = useState<Viewing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { nav('/login'); return; }

    fetch('/api/me/viewings', { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => {
        if (!j.success) throw new Error(j.error?.message ?? 'Failed');
        setViewings(j.data.viewings);
      })
      .catch(e => setError(e.message));
  }, [nav]);

  function logout() {
    localStorage.removeItem('hf_token');
    nav('/');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">My dashboard</h1>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">
          Sign out
        </button>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Viewing requests</h2>

      {error && <EmptyState title="Could not load" message={error} />}
      {!viewings && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}
      {viewings && viewings.length === 0 && (
        <div className="rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">You haven't requested any viewings yet.</p>
          <Link to="/search" className="inline-block mt-4 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">
            Browse properties
          </Link>
        </div>
      )}
      {viewings && viewings.length > 0 && (
        <div className="space-y-3">
          {viewings.map(v => (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 flex gap-4">
              <Link to={`/property/${v.slug}`} className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={v.main_image_url || 'https://placehold.co/200x200/e2e8f0/64748b?text=No'}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <Link to={`/property/${v.slug}`} className="font-medium text-slate-900 truncate hover:text-brand-600">
                    {v.title}
                  </Link>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLES[v.status] ?? STATUS_STYLES.pending}`}>
                    {v.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[v.city, v.country].filter(Boolean).join(', ')}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  <strong>Preferred:</strong> {v.preferred_date} at {v.preferred_time}
                </p>
                {v.owner_note && (
                  <p className="text-sm text-slate-600 mt-1">
                    <strong>Owner note:</strong> {v.owner_note}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <PriceDisplay amount={v.price_amount} currency={v.currency} period={v.price_period} />
                  <span className="text-xs text-slate-400">
                    Requested {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
