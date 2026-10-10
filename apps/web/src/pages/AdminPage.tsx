import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Tab = 'overview' | 'verifications' | 'promotions' | 'listings' | 'users' | 'reports';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',      label: 'Overview',      icon: 'grid' },
  { id: 'verifications', label: 'Verifications', icon: 'check' },
  { id: 'promotions',    label: 'Promotions',    icon: 'spark' },
  { id: 'listings',      label: 'Listings',      icon: 'home' },
  { id: 'users',         label: 'Users',         icon: 'users' },
  { id: 'reports',       label: 'Reports',       icon: 'flag' },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listingFilter, setListingFilter] = useState('pending_review');
  const nav = useNavigate();

  const token = () => localStorage.getItem('hf_token') ?? '';

  async function loadOverview() {
    const res = await fetch(`${API}/admin/overview`, { headers: { Authorization: `Bearer ${token()}` } });
    const j = await res.json();
    if (j.success) setOverview(j.data);
  }

  async function loadTab(t: Tab) {
    if (t === 'overview') { await loadOverview(); return; }

    setLoading(true); setError(null);
    try {
      let endpoint = '';
      let key = '';

      if (t === 'verifications') { endpoint = '/api/admin/verifications'; key = 'verifications'; }
      else if (t === 'promotions') { endpoint = '/api/admin/promotions'; key = 'promotions'; }
      else if (t === 'listings') { endpoint = `${API}/admin/listings?status=${listingFilter}`; key = 'listings'; }
      else if (t === 'users') { endpoint = `${API}/admin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`; key = 'users'; }
      else if (t === 'reports') { endpoint = '/api/admin/reports'; key = 'reports'; }

      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token()}` } });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setItems(j.data[key] ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token()) { nav('/login'); return; }
    loadTab(tab);
  }, [tab, listingFilter]);

  async function verifyAction(id: string, status: 'approved' | 'rejected') {
    const note = status === 'rejected' ? (prompt('Reason for rejection?') ?? '') : '';
    await fetch(`${API}/admin/verifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status, adminNote: note }),
    });
    loadTab('verifications');
    loadOverview();
  }

  async function activatePromotion(id: string) {
    await fetch(`${API}/admin/promotions/${id}/activate`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token()}` },
    });
    loadTab('promotions');
    loadOverview();
  }

  async function cancelPromotion(id: string) {
    if (!confirm('Cancel this promotion and refund?')) return;
    await fetch(`${API}/admin/promotions/${id}/cancel`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token()}` },
    });
    loadTab('promotions');
  }

  async function moderateListing(id: string, action: 'approve' | 'reject' | 'suspend' | 'restore') {
    await fetch(`${API}/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action }),
    });
    loadTab('listings');
    loadOverview();
  }

  async function moderateUser(id: string, action: 'ban' | 'unban' | 'promote_owner' | 'promote_agent' | 'demote') {
    await fetch(`${API}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action }),
    });
    loadTab('users');
  }

  const badgeFor = (id: Tab): number | undefined => {
    if (!overview) return undefined;
    if (id === 'verifications') return overview.verifications_pending || undefined;
    if (id === 'promotions')    return overview.promotions_pending || undefined;
    if (id === 'listings')      return overview.listings_pending || undefined;
    if (id === 'reports')       return overview.reports_open || undefined;
  };

  return (
    <div className="container-page py-8 sm:py-10 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">Admin</div>
          <h1 className="h1 text-ink-900">Control Center</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="btn btn-secondary btn-sm">← Back to site</Link>
          <button onClick={() => loadTab(tab)} className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 10 A7 7 0 0 1 17 10 M17 10 L14 7 M17 10 L20 7 M17 10 A7 7 0 0 1 3 10 M3 10 L6 13 M3 10 L0 13" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink-200 mb-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(t => {
          const badge = badgeFor(t.id);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${
                active ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <TabIcon kind={t.icon} active={active} />
              {t.label}
              {badge ? (
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                  active ? 'bg-brand-600 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {badge}
                </span>
              ) : null}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />}
            </button>
          );
        })}
      </div>

      {error && <EmptyState title="Error" message={error} />}

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total users" value={overview.users} sub={`+${overview.users_new_7d} in last 7d`} accent />
            <StatCard label="Published" value={overview.listings_published} sub={`+${overview.listings_new_7d} in last 7d`} accent />
            <StatCard label="Pending review" value={overview.listings_pending} warn={overview.listings_pending > 0} />
            <StatCard label="Verification queue" value={overview.verifications_pending} warn={overview.verifications_pending > 0} />
            <StatCard label="Promotion queue" value={overview.promotions_pending} warn={overview.promotions_pending > 0} />
            <StatCard label="Pending viewings" value={overview.viewings_pending} />
            <StatCard label="Open reports" value={overview.reports_open} warn={overview.reports_open > 0} />
            <StatCard label="Countries live" value={10} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RevenueCard label="Promotion revenue" amount={Number(overview.revenue_promotions_ugx)} icon="spark" />
            <RevenueCard label="Verification revenue" amount={Number(overview.revenue_verifications_ugx)} icon="check" />
          </div>

          {/* Quick actions */}
          <div className="mt-8">
            <h3 className="h3 text-ink-900 mb-4">Quick actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickAction icon="check" label="Verifications" count={overview.verifications_pending} onClick={() => setTab('verifications')} />
              <QuickAction icon="spark" label="Promotions"    count={overview.promotions_pending} onClick={() => setTab('promotions')} />
              <QuickAction icon="home"  label="Listings"      count={overview.listings_pending} onClick={() => setTab('listings')} />
              <QuickAction icon="flag"  label="Reports"       count={overview.reports_open} onClick={() => setTab('reports')} />
            </div>
          </div>
        </>
      )}

      {/* ═══ VERIFICATIONS ═══ */}
      {tab === 'verifications' && (
        <List loading={loading} empty={items.length === 0} emptyMsg="No pending verification requests.">
          {items.map(v => (
            <AdminRow key={v.id}>
              <Thumb url={v.main_image_url} />
              <div className="flex-1 min-w-0">
                <Link to={`/property/${v.slug}`} className="font-semibold text-ink-900 hover:text-brand-600 truncate block text-base">{v.title}</Link>
                <p className="text-sm text-ink-500 mt-1">{v.city} · {v.user_name} ({v.user_email})</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="badge badge-sourced">{v.requested_tier}</span>
                  <span className="text-sm text-ink-700 font-semibold">UGX {Number(v.price_amount).toLocaleString()}</span>
                  <span className={`badge ${v.payment_status === 'paid' ? 'badge-verified' : 'badge-unverified'}`}>
                    {v.payment_status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => verifyAction(v.id, 'approved')} className="btn btn-primary btn-sm">Approve</button>
                <button onClick={() => verifyAction(v.id, 'rejected')} className="btn btn-secondary btn-sm text-red-600 hover:border-red-300">Reject</button>
              </div>
            </AdminRow>
          ))}
        </List>
      )}

      {/* ═══ PROMOTIONS ═══ */}
      {tab === 'promotions' && (
        <List loading={loading} empty={items.length === 0} emptyMsg="No pending promotions.">
          {items.map(p => (
            <AdminRow key={p.id}>
              <Thumb url={p.main_image_url} />
              <div className="flex-1 min-w-0">
                <Link to={`/property/${p.slug}`} className="font-semibold text-ink-900 hover:text-brand-600 truncate block text-base">{p.title}</Link>
                <p className="text-sm text-ink-500 mt-1">{p.user_name} ({p.user_email})</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="badge badge-sourced">{p.tier}</span>
                  <span className="text-sm text-ink-700 font-semibold">UGX {Number(p.price_amount).toLocaleString()}</span>
                  <span className={`badge ${p.payment_status === 'paid' ? 'badge-verified' : 'badge-unverified'}`}>
                    {p.payment_status}
                  </span>
                  {p.payment_reference && <span className="text-xs text-ink-400">Ref: {p.payment_reference}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => activatePromotion(p.id)} className="btn btn-primary btn-sm">Activate</button>
                    <button onClick={() => cancelPromotion(p.id)} className="btn btn-secondary btn-sm text-red-600 hover:border-red-300">Cancel</button>
                  </>
                )}
                {p.status === 'active' && (
                  <span className="text-sm text-emerald-700 font-semibold self-center">Active until {new Date(p.expires_at).toLocaleDateString()}</span>
                )}
              </div>
            </AdminRow>
          ))}
        </List>
      )}

      {/* ═══ LISTINGS ═══ */}
      {tab === 'listings' && (
        <>
          {/* Status filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['pending_review', 'published', 'draft', 'rejected', 'suspended'].map(s => (
              <button
                key={s}
                onClick={() => setListingFilter(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  listingFilter === s
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                    : 'bg-white border border-ink-200 text-ink-600 hover:border-brand-300'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <List loading={loading} empty={items.length === 0} emptyMsg={`No listings with status "${listingFilter}".`}>
            {items.map(l => (
              <AdminRow key={l.id}>
                <Thumb url={l.main_image_url} />
                <div className="flex-1 min-w-0">
                  <Link to={`/property/${l.slug}`} className="font-semibold text-ink-900 hover:text-brand-600 truncate block text-base">{l.title}</Link>
                  <p className="text-sm text-ink-500 mt-1">{l.city}, {l.country} · {l.owner_name} ({l.owner_email})</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-sm text-ink-700 font-semibold">{l.currency} {Number(l.price_amount ?? 0).toLocaleString()}</span>
                    <span className="badge badge-classified">{l.source_code ?? 'user'}</span>
                    <span className="text-xs text-ink-400">{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {listingFilter === 'pending_review' && (
                    <>
                      <button onClick={() => moderateListing(l.id, 'approve')} className="btn btn-primary btn-sm">Approve</button>
                      <button onClick={() => moderateListing(l.id, 'reject')} className="btn btn-secondary btn-sm text-red-600 hover:border-red-300">Reject</button>
                    </>
                  )}
                  {listingFilter === 'published' && (
                    <button onClick={() => moderateListing(l.id, 'suspend')} className="btn btn-secondary btn-sm text-red-600 hover:border-red-300">Suspend</button>
                  )}
                  {(listingFilter === 'rejected' || listingFilter === 'suspended') && (
                    <button onClick={() => moderateListing(l.id, 'restore')} className="btn btn-primary btn-sm">Restore</button>
                  )}
                </div>
              </AdminRow>
            ))}
          </List>
        </>
      )}

      {/* ═══ USERS ═══ */}
      {tab === 'users' && (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); loadTab('users'); }}
            className="mb-6 flex gap-2"
          >
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email or name…"
              className="input max-w-md"
            />
            <button type="submit" className="btn btn-primary btn-md">Search</button>
          </form>

          <List loading={loading} empty={items.length === 0} emptyMsg="No users found.">
            {items.map(u => (
              <AdminRow key={u.id}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm shadow-brand-600/20">
                  {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900 text-base truncate">{u.full_name}</p>
                    <span className={`badge ${
                      u.role === 'admin' || u.role === 'super_admin' ? 'badge-verified'
                      : u.role === 'owner' || u.role === 'provider' ? 'badge-sourced'
                      : 'badge-unverified'
                    }`}>
                      {u.role}
                    </span>
                    {u.is_banned && <span className="badge badge-unclassified bg-red-100 text-red-700 ring-red-200">Banned</span>}
                  </div>
                  <p className="text-sm text-ink-500 mt-1 truncate">{u.email}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-ink-600">
                    <span><strong className="text-ink-800">{u.listing_count}</strong> listings</span>
                    <span><strong className="text-ink-800">{u.incoming_viewings}</strong> viewings</span>
                    {u.last_login_at && <span className="text-xs text-ink-400">Last login: {new Date(u.last_login_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!u.is_banned ? (
                    <button onClick={() => moderateUser(u.id, 'ban')} className="btn btn-secondary btn-sm text-red-600 hover:border-red-300">Ban</button>
                  ) : (
                    <button onClick={() => moderateUser(u.id, 'unban')} className="btn btn-secondary btn-sm">Unban</button>
                  )}
                  {u.role === 'user' && (
                    <button onClick={() => moderateUser(u.id, 'promote_owner')} className="btn btn-secondary btn-sm">→ Owner</button>
                  )}
                </div>
              </AdminRow>
            ))}
          </List>
        </>
      )}

      {/* ═══ REPORTS ═══ */}
      {tab === 'reports' && (
        <List loading={loading} empty={items.length === 0} emptyMsg="No open reports.">
          {items.map(r => (
            <AdminRow key={r.id}>
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15 V4 H14 L12 6 L14 8 H4" />
                  <path d="M4 22 V15" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900 text-base capitalize">{r.reason}</p>
                {r.details && <p className="text-sm text-ink-600 mt-1 line-clamp-2">{r.details}</p>}
                <p className="text-xs text-ink-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
              </div>
            </AdminRow>
          ))}
        </List>
      )}
    </div>
  );
}

function TabIcon({ kind, active }: { kind: string; active: boolean }) {
  const cls = `w-4 h-4 ${active ? 'text-brand-600' : 'text-ink-400'}`;
  const icons: Record<string, JSX.Element> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    check: <path d="M4 11 L9 16 L20 5" />,
    spark: <path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" />,
    home: <path d="M3 10 L12 3 L21 10 L21 20 L15 20 L15 14 L9 14 L9 20 L3 20 Z" />,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20 C3 16 6 14 9 14 C12 14 15 16 15 20 M17 11 C19 11 21 13 21 16" /></>,
    flag: <><path d="M4 15 V4 H14 L12 6 L14 8 H4" /><path d="M4 22 V15" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[kind]}
    </svg>
  );
}

function StatCard({ label, value, sub, warn, accent }: { label: string; value: number; sub?: string; warn?: boolean; accent?: boolean }) {
  const bg = warn ? 'border-amber-200 bg-amber-50/60' : accent ? 'border-brand-100 bg-gradient-to-br from-white to-brand-50/40' : 'border-ink-200 bg-white';
  const text = warn ? 'text-amber-800' : 'text-ink-900';
  return (
    <div className={`rounded-2xl border ${bg} p-5 shadow-soft`}>
      <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{label}</p>
      <p className={`text-4xl font-extrabold mt-3 font-display tracking-tight ${text}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-ink-400 mt-2">{sub}</p>}
    </div>
  );
}

function RevenueCard({ label, amount, icon }: { label: string; amount: number; icon: string }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500 font-semibold">{label}</p>
          <p className="text-3xl font-extrabold text-ink-900 mt-3 font-display tracking-tight">
            UGX {amount.toLocaleString()}
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon === 'spark'
              ? <path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" />
              : <path d="M4 11 L9 16 L20 5" />}
          </svg>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, count, onClick }: { icon: string; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`card card-hover p-5 text-left ${count > 0 ? 'border-amber-200 bg-amber-50/40' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${count > 0 ? 'bg-amber-100' : 'bg-brand-50'}`}>
          <TabIcon kind={icon} active={false} />
        </div>
        {count > 0 && (
          <span className="text-xs font-bold bg-amber-600 text-white rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      <p className="font-semibold text-ink-900 text-sm">{label}</p>
      <p className="text-xs text-ink-500 mt-0.5">{count > 0 ? `${count} pending` : 'All clear'}</p>
    </button>
  );
}

function AdminRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
      {children}
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-ink-100">
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        : <div className="w-full h-full flex items-center justify-center text-ink-400 text-xs">—</div>}
    </div>
  );
}

function List({ loading, empty, emptyMsg, children }: {
  loading: boolean; empty: boolean; emptyMsg: string; children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-ink-100 animate-pulse" />)}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11 L9 16 L20 5" />
          </svg>
        </div>
        <p className="text-ink-700 font-medium">{emptyMsg}</p>
        <p className="text-ink-400 text-sm mt-1">All clear — nothing to review right now.</p>
      </div>
    );
  }
  return <div className="space-y-3">{children}</div>;
}
