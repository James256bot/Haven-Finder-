import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Incoming = {
  id: string;
  status: string;
  preferred_date: string;
  preferred_time: string;
  message: string | null;
  contact_phone: string | null;
  owner_note: string | null;
  created_at: string;
  requester_name: string;
  requester_email: string;
  listing_id: string;
  slug: string;
  title: string;
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

export function OwnerViewingsPage() {
  const [items, setItems] = useState<Incoming[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const nav = useNavigate();

  const token = () => localStorage.getItem('hf_token') ?? '';

  async function load() {
    try {
      const res = await fetch(`${API}/me/incoming`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setItems(j.data.viewings);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!token()) { nav('/login'); return; }
    load();
  }, [nav]);

  async function respond(id: string, status: string) {
    setBusy(id);
    try {
      const res = await fetch(`${API}/viewings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold text-slate-900 mb-1">Incoming viewing requests</h1>
      <p className="text-slate-500 text-sm mb-8">Requests on properties you own or manage.</p>

      {error && <EmptyState title="Could not load" message={error} />}
      {!items && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      )}
      {items && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No incoming requests yet.</p>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map(v => (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex gap-4">
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
                    <Link to={`/property/${v.slug}`} className="font-medium text-slate-900 hover:text-brand-600 truncate">
                      {v.title}
                    </Link>
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLES[v.status] ?? STATUS_STYLES.pending}`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    <strong>{v.requester_name}</strong> · {v.requester_email}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Preferred:</strong> {v.preferred_date} at {v.preferred_time}
                  </p>
                  {v.contact_phone && (
                    <p className="text-sm text-slate-600">
                      <strong>Phone:</strong>{' '}
                      <a href={`tel:${v.contact_phone}`} className="text-brand-600 hover:underline">{v.contact_phone}</a>
                    </p>
                  )}
                  {v.message && (
                    <p className="text-sm text-slate-700 mt-2 italic">"{v.message}"</p>
                  )}
                </div>
              </div>
              {v.status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    disabled={busy === v.id}
                    onClick={() => respond(v.id, 'confirmed')}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    disabled={busy === v.id}
                    onClick={() => respond(v.id, 'rescheduled')}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium"
                  >
                    Reschedule
                  </button>
                  <button
                    disabled={busy === v.id}
                    onClick={() => respond(v.id, 'rejected')}
                    className="flex-1 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
