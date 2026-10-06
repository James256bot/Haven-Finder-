import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PromoteButton } from '../components/PromoteButton';

type Row = {
  id: string; slug: string; title: string; status: string;
  city: string | null; price_amount: string | null;
  currency: string | null; price_period: string | null;
  main_image_url: string | null;
  view_count: number | null; favorite_count: number | null; inquiry_count: number | null;
  image_count: number; created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  published:      'bg-emerald-50 text-emerald-700',
  pending_review: 'bg-amber-50 text-amber-700',
  draft:          'bg-slate-100 text-slate-600',
  paused:         'bg-sky-50 text-sky-700',
  rejected:       'bg-red-50 text-red-700',
};

export function MyListingsPage() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  async function load() {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { nav('/login'); return; }
    try {
      const res = await fetch('/api/me/listings', { headers: { Authorization: `Bearer ${tk}` } });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setItems(j.data.listings);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm('Delete this listing?')) return;
    const tk = localStorage.getItem('hf_token') ?? '';
    await fetch(`/api/me/listings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } });
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">My listings</h1>
          <p className="text-slate-500 text-sm mt-1">{items ? `${items.length} total` : 'Loading…'}</p>
        </div>
        <Link to="/list" className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">
          + New listing
        </Link>
      </div>

      {error && <EmptyState title="Could not load" message={error} />}
      {items && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-700 font-medium">No listings yet</p>
          <Link to="/list" className="inline-block mt-6 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">
            Create listing
          </Link>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map(l => (
            <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 flex gap-4">
              <Link to={`/property/${l.slug}`} className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {l.main_image_url ? (
                  <img src={l.main_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No image</div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <Link to={`/property/${l.slug}`} className="font-medium text-slate-900 truncate hover:text-brand-600">
                    {l.title}
                  </Link>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[l.status] ?? STATUS_STYLE.draft}`}>
                    {l.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{l.city ?? '—'} · {l.image_count} photos</p>
                <p className="text-sm text-slate-900 font-semibold mt-1">
                  {l.currency} {Number(l.price_amount ?? 0).toLocaleString()}
                  <span className="text-slate-500 font-normal">
                    {l.price_period === 'monthly' ? '/mo' : l.price_period === 'nightly' ? '/night' : ''}
                  </span>
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>{l.view_count ?? 0} views</span>
                  <span>{l.favorite_count ?? 0} favorites</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <PromoteButton listingId={l.id} />
                <button onClick={() => del(l.id)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
