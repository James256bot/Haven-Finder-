import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

type Overview = {
  users: number; users_new_7d: number;
  listings_published: number; listings_pending: number; listings_new_7d: number;
  viewings_pending: number;
  verifications_pending: number;
  promotions_pending: number;
  reports_open: number;
  revenue_promotions_ugx: string;
  revenue_verifications_ugx: string;
};

type Tab = 'overview' | 'verifications' | 'promotions' | 'listings' | 'users';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const token = () => localStorage.getItem('hf_token') ?? '';

  async function loadOverview() {
    const res = await fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token()}` } });
    const j = await res.json();
    if (!j.success) throw new Error(j.error?.message ?? 'Failed');
    setOverview(j.data);
  }

  async function loadTab(t: Tab) {
    if (t === 'overview') { await loadOverview(); return; }

    setLoading(true); setError(null);
    try {
      const endpoint =
        t === 'verifications' ? '/api/admin/verifications' :
        t === 'promotions'    ? '/api/admin/promotions' :
        t === 'listings'      ? '/api/admin/listings?status=pending_review' :
        t === 'users'         ? '/api/admin/users' : '';
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token()}` } });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');

      const key = t === 'verifications' ? 'verifications' :
                  t === 'promotions'    ? 'promotions' :
                  t === 'listings'      ? 'listings' :
                  t === 'users'         ? 'users' : 'items';
      setItems(j.data[key] ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token()) { nav('/login'); return; }
    loadTab(tab);
  }, [tab, nav]);

  async function verifyAction(id: string, status: 'approved'|'rejected') {
    const note = status === 'rejected' ? prompt('Reason for rejection?') ?? '' : '';
    await fetch(`/api/admin/verifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status, adminNote: note }),
    });
    loadTab('verifications');
  }

  async function activatePromotion(id: string) {
    await fetch(`/api/admin/promotions/${id}/activate`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token()}` },
    });
    loadTab('promotions');
  }

  async function cancelPromotion(id: string) {
    if (!confirm('Cancel this promotion and refund?')) return;
    await fetch(`/api/admin/promotions/${id}/cancel`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token()}` },
    });
    loadTab('promotions');
  }

  async function moderateListing(id: string, action: 'approve'|'reject'|'suspend') {
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action }),
    });
    loadTab('listings');
  }

  async function moderateUser(id: string, action: 'ban'|'unban'|'promote_owner'|'promote_agent'|'demote') {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action }),
    });
    loadTab('users');
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'verifications', label: 'Verifications', badge: overview?.verifications_pending },
    { id: 'promotions', label: 'Promotions', badge: overview?.promotions_pending },
    { id: 'listings', label: 'Listings', badge: overview?.listings_pending },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Admin</h1>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">← Back to site</Link>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {error && <EmptyState title="Error" message={error} />}

      {/* OVERVIEW */}
      {tab === 'overview' && overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card label="Users" value={overview.users} sub={`+${overview.users_new_7d} in last 7d`} />
          <Card label="Published listings" value={overview.listings_published} sub={`+${overview.listings_new_7d} in last 7d`} />
          <Card label="Pending review" value={overview.listings_pending} warn={overview.listings_pending > 0} />
          <Card label="Verification queue" value={overview.verifications_pending} warn={overview.verifications_pending > 0} />
          <Card label="Promotion queue" value={overview.promotions_pending} warn={overview.promotions_pending > 0} />
          <Card label="Pending viewings" value={overview.viewings_pending} />
          <Card label="Revenue (promotions)" value={`UGX ${Number(overview.revenue_promotions_ugx).toLocaleString()}`} />
          <Card label="Revenue (verifications)" value={`UGX ${Number(overview.revenue_verifications_ugx).toLocaleString()}`} />
          <Card label="Open reports" value={overview.reports_open} warn={overview.reports_open > 0} />
        </div>
      )}

      {/* VERIFICATIONS */}
      {tab === 'verifications' && (
        <List loading={loading} empty={items.length === 0}>
          {items.map(v => (
            <Row key={v.id}>
              <Thumb url={v.main_image_url} />
              <div className="flex-1 min-w-0">
                <Link to={`/property/${v.slug}`} className="font-medium text-slate-900 hover:text-brand-600 truncate block">{v.title}</Link>
                <p className="text-xs text-slate-500">{v.city} · {v.user_name} ({v.user_email})</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tier: <strong>{v.requested_tier}</strong> · UGX {Number(v.price_amount).toLocaleString()} · {v.payment_status}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Current: {v.current_verification}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => verifyAction(v.id, 'approved')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium">Approve</button>
                <button onClick={() => verifyAction(v.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs">Reject</button>
              </div>
            </Row>
          ))}
        </List>
      )}

      {/* PROMOTIONS */}
      {tab === 'promotions' && (
        <List loading={loading} empty={items.length === 0}>
          {items.map(p => (
            <Row key={p.id}>
              <Thumb url={p.main_image_url} />
              <div className="flex-1 min-w-0">
                <Link to={`/property/${p.slug}`} className="font-medium text-slate-900 hover:text-brand-600 truncate block">{p.title}</Link>
                <p className="text-xs text-slate-500">{p.user_name} ({p.user_email})</p>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>{p.tier}</strong> · UGX {Number(p.price_amount).toLocaleString()} · {p.status} · {p.payment_status}
                </p>
                {p.payment_reference && <p className="text-xs text-slate-400">Ref: {p.payment_reference}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => activatePromotion(p.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium">Activate</button>
                    <button onClick={() => cancelPromotion(p.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs">Cancel</button>
                  </>
                )}
                {p.status === 'active' && (
                  <span className="text-xs text-emerald-700 self-center">Active until {new Date(p.expires_at).toLocaleDateString()}</span>
                )}
              </div>
            </Row>
          ))}
        </List>
      )}

      {/* LISTINGS MODERATION */}
      {tab === 'listings' && (
        <List loading={loading} empty={items.length === 0}>
          {items.map(l => (
            <Row key={l.id}>
              <Thumb url={l.main_image_url} />
              <div className="flex-1 min-w-0">
                <Link to={`/property/${l.slug}`} className="font-medium text-slate-900 hover:text-brand-600 truncate block">{l.title}</Link>
                <p className="text-xs text-slate-500">{l.city}, {l.country} · {l.owner_name} ({l.owner_email})</p>
                <p className="text-xs text-slate-500 mt-1">
                  {l.currency} {Number(l.price_amount ?? 0).toLocaleString()} · {l.source_code ?? 'user'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => moderateListing(l.id, 'approve')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs">Approve</button>
                <button onClick={() => moderateListing(l.id, 'reject')}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs">Reject</button>
              </div>
            </Row>
          ))}
        </List>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <List loading={loading} empty={items.length === 0}>
          {items.map(u => (
            <Row key={u.id}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{u.full_name}</p>
                <p className="text-xs text-slate-500">{u.email} · {u.role}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {u.listing_count} listings · {u.incoming_viewings} viewings
                  {u.is_banned && <span className="ml-2 text-red-600 font-medium">BANNED</span>}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!u.is_banned ? (
                  <button onClick={() => moderateUser(u.id, 'ban')}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs">Ban</button>
                ) : (
                  <button onClick={() => moderateUser(u.id, 'unban')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">Unban</button>
                )}
                {u.role === 'user' && (
                  <button onClick={() => moderateUser(u.id, 'promote_owner')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs">→ Owner</button>
                )}
              </div>
            </Row>
          ))}
        </List>
      )}
    </div>
  );
}

function Card({ label, value, sub, warn }: { label: string; value: number | string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${warn ? 'text-amber-800' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-4 items-center p-4 rounded-xl border border-slate-200 bg-white">{children}</div>;
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
      {url && <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
    </div>
  );
}

function List({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}</div>;
  }
  if (empty) {
    return (
      <div className="rounded-2xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500">Nothing here right now.</p>
      </div>
    );
  }
  return <div className="space-y-3">{children}</div>;
}
