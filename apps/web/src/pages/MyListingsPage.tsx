import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PromoteButton } from '../components/PromoteButton';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Row = {
  id: string; slug: string; title: string; status: string;
  city: string | null; price_amount: string | null;
  currency: string | null; price_period: string | null;
  main_image_url: string | null;
  view_count: number | null; favorite_count: number | null; inquiry_count: number | null;
  image_count: number; created_at: string;
  leads_count?: number | null;
  leads_7d?: number | null;
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nav = useNavigate();

  async function load() {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { nav('/login'); return; }
    try {
      const res = await fetch(`${API}/me/listings`, { headers: { Authorization: `Bearer ${tk}` } });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setItems(j.data.listings);
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const tk = localStorage.getItem('hf_token') ?? '';
    await fetch(`${API}/me/listings/${deleteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } });
    setDeleteId(null);
    setDeleting(false);
    await load();
  }

  const stats = items ? {
    total: items.length,
    published: items.filter(x => x.status === 'published').length,
    views: items.reduce((sum, x) => sum + (x.view_count ?? 0), 0),
    favorites: items.reduce((sum, x) => sum + (x.favorite_count ?? 0), 0),
    leads: items.reduce((sum, x) => sum + (x.leads_count ?? 0), 0),
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
        <Link to="/list" className="btn btn-primary btn-md">List a property</Link>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total views" value={stats.views} />
          <StatCard label="Favorites" value={stats.favorites} />
          <StatCard label="Leads" value={stats.leads} />
          <StatCard label="Published" value={stats.published} />
        </div>
      )}

      {items === null && (
        <div className="py-12 text-center text-slate-500">Loading your listings…</div>
      )}

      {items && items.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-slate-700 font-medium text-lg">No listings yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first listing and reach thousands of renters.</p>
          <Link to="/list" className="btn btn-primary btn-md mt-6 inline-flex">Create listing</Link>
        </div>
      )}

      {/* Listings */}
      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map(l => (
            <div key={l.id} className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={`/listing/${l.slug}`} className="w-full sm:w-32 h-32 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                  {l.main_image_url ? (
                    <img src={l.main_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No image</div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link to={`/listing/${l.slug}`} className="font-semibold text-slate-900 hover:text-brand-700 truncate text-base">
                      {l.title}
                    </Link>
                    <span className={`badge border ${STATUS_STYLE[l.status] ?? STATUS_STYLE.draft}`}>
                      {l.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {l.city ?? '—'} · {l.image_count} photo{l.image_count === 1 ? '' : 's'}
                  </p>

                  <p className="text-base font-semibold text-slate-900 mt-2">
                    {l.currency} {Number(l.price_amount ?? 0).toLocaleString()}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                    <Metric icon="eye" value={l.view_count ?? 0} label="views" />
                    <Metric icon="heart" value={l.favorite_count ?? 0} label="favorites" />
                    <Metric icon="chat" value={l.inquiry_count ?? 0} label="inquiries" />
                    {(l.leads_count ?? 0) > 0 && (
                      <span className="text-emerald-600 font-medium">
                        📞 {l.leads_count} lead{l.leads_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2">
                  <PromoteButton listingId={l.id} />
                  <button
                    onClick={() => setDeleteId(l.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setDeleteId(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete this listing?</h3>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone. The property will be removed from HavenFinder.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
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
