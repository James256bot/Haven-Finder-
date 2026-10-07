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
  published:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  draft:          'bg-slate-100 text-slate-600 border-slate-200',
  paused:         'bg-sky-50 text-sky-700 border-sky-200',
  rejected:       'bg-red-50 text-red-700 border-red-200',
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

  const stats = items ? {
    total: items.length,
    published: items.filter(x => x.status === 'published').length,
    views: items.reduce((sum, x) => sum + (x.view_count ?? 0), 0),
    favorites: items.reduce((sum, x) => sum + (x.favorite_count ?? 0), 0),
  } : null;

  return (
    <div className="container-page py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="h1 text-slate-900">My listings</h1>
          <p className="text-slate-500 text-sm mt-1">
            {items ? `${items.length} total propert${items.length === 1 ? 'y' : 'ies'}` : 'Loading…'}
          </p>
        </div>
        <Link to="/list" className="btn btn-primary btn-md shadow-sm shadow-brand-600/20 self-start sm:self-auto">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M10 4 V16 M4 10 H16" />
          </svg>
          New listing
        </Link>
      </div>

      {/* Stat cards */}
      {stats && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active" value={stats.published} />
          <StatCard label="Total listings" value={stats.total} />
          <StatCard label="Total views" value={stats.views} />
          <StatCard label="Favorites" value={stats.favorites} />
        </div>
      )}

      {error && <EmptyState title="Could not load" message={error} />}

      {items && items.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10 L12 3 L21 10 L21 20 L15 20 L15 14 L9 14 L9 20 L3 20 Z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium text-lg">No listings yet</p>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Create your first listing and reach thousands of renters on HavenFinder.</p>
          <Link to="/list" className="btn btn-primary btn-md mt-6 inline-flex">Create listing</Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map(l => (
            <div key={l.id} className="card p-4 sm:p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={`/property/${l.slug}`} className="w-full sm:w-32 h-32 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                  {l.main_image_url ? (
                    <img src={l.main_image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No image</div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link to={`/property/${l.slug}`} className="font-semibold text-slate-900 hover:text-brand-700 truncate text-base">
                      {l.title}
                    </Link>
                    <span className={`badge border ${STATUS_STYLE[l.status] ?? STATUS_STYLE.draft}`}>
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>{l.city ?? '—'}</span>
                    <span>·</span>
                    <span>{l.image_count} photo{l.image_count === 1 ? '' : 's'}</span>
                  </p>

                  <p className="text-base font-semibold text-slate-900 mt-2">
                    {l.currency} {Number(l.price_amount ?? 0).toLocaleString()}
                    <span className="text-slate-500 font-normal text-sm">
                      {l.price_period === 'monthly' ? '/mo' : l.price_period === 'nightly' ? '/night' : ''}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                    <Metric icon="eye" value={l.view_count ?? 0} label="views" />
                    <Metric icon="heart" value={l.favorite_count ?? 0} label="favorites" />
                    <Metric icon="chat" value={l.inquiry_count ?? 0} label="inquiries" />
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 sm:w-auto">
                  <PromoteButton listingId={l.id} />
                  <button
                    onClick={() => del(l.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: string; value: number; label: string }) {
  const icons: Record<string, JSX.Element> = {
    eye: <><circle cx="10" cy="10" r="6" /><path d="M3 10 L10 4 L17 10" /></>,
    heart: <path d="M17 4a4 4 0 00-7 2 4 4 0 00-7-2c-2 2-2 5 0 7l7 7 7-7c2-2 2-5 0-7z" />,
    chat: <path d="M18 10 A8 8 0 1 1 10 2 L18 2 L18 10 Z" />,
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[icon]}
      </svg>
      <strong className="text-slate-700">{value}</strong> {label}
    </span>
  );
}
