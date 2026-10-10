import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Viewing = {
  id: string; status: string;
  preferred_date: string; preferred_time: string;
  message: string | null; owner_note: string | null;
  created_at: string;
  listing_id: string; slug: string; title: string;
  city: string | null; country: string | null;
  main_image_url: string | null;
  price_amount: string | null; currency: string | null; price_period: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  rescheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  rejected:    'bg-red-50 text-red-700 border-red-200',
  completed:   'bg-slate-100 text-slate-600 border-slate-200',
  cancelled:   'bg-slate-100 text-slate-600 border-slate-200',
};

export function DashboardPage() {
  const [viewings, setViewings] = useState<Viewing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { nav('/login'); return; }

    Promise.all([
      fetch(`${API}/me/viewings`, { headers: { Authorization: `Bearer ${tk}` } }).then(r => r.json()),
      fetch(`${API}/me/favorites/ids`, { headers: { Authorization: `Bearer ${tk}` } }).then(r => r.json()),
    ])
      .then(([v, f]) => {
        if (!v.success) throw new Error(v.error?.message ?? 'Failed');
        setViewings(v.data.viewings);
      })
      .catch(e => setError(e.message));
  }, [nav]);

  function logout() {
    localStorage.removeItem('hf_token');
    nav('/');
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="h1 text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Your activity on HavenFinder</p>
        </div>
        <button onClick={logout} className="btn btn-secondary btn-sm">Sign out</button>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <QuickLink to="/favorites" label="Saved"    icon="heart" />
        <QuickLink to="/messages"  label="Messages" icon="chat" />
        <QuickLink to="/my-listings" label="Listings" icon="home" />
        <QuickLink to="/list"      label="List new" icon="plus" />
      </div>

      {/* Viewings */}
      <div className="mb-6">
        <h2 className="h3 text-slate-900">Your viewing requests</h2>
        <p className="text-slate-500 text-sm mt-1">Track the properties you want to see</p>
      </div>

      {error && <EmptyState title="Could not load" message={error} />}
      {!viewings && !error && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      )}
      {viewings && viewings.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10 H21 M8 3 V7 M16 3 V7" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium text-lg">No viewing requests yet</p>
          <p className="text-slate-500 text-sm mt-1">Find a property you like and request a viewing.</p>
          <Link to="/search" className="btn btn-primary btn-md mt-6 inline-flex">Browse properties</Link>
        </div>
      )}
      {viewings && viewings.length > 0 && (
        <div className="space-y-3">
          {viewings.map(v => (
            <div key={v.id} className="card p-4">
              <div className="flex gap-4">
                <Link to={`/property/${v.slug}`} className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                  {v.main_image_url
                    ? <img src={v.main_image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">—</div>}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link to={`/property/${v.slug}`} className="font-semibold text-slate-900 hover:text-brand-700 truncate">
                      {v.title}
                    </Link>
                    <span className={`badge border ${STATUS_STYLE[v.status] ?? STATUS_STYLE.pending}`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{[v.city, v.country].filter(Boolean).join(', ')}</p>
                  <p className="text-sm text-slate-600 mt-2">
                    <strong className="font-medium">Preferred:</strong> {v.preferred_date} at {v.preferred_time}
                  </p>
                  {v.owner_note && (
                    <p className="text-sm text-slate-600 mt-1 italic">"{v.owner_note}"</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  const icons: Record<string, JSX.Element> = {
    heart: <path d="M17 4a4 4 0 00-7 2 4 4 0 00-7-2c-2 2-2 5 0 7l7 7 7-7c2-2 2-5 0-7z" />,
    chat:  <path d="M18 10 A8 8 0 1 1 10 2 L18 2 L18 10 Z" />,
    home:  <path d="M3 10 L12 3 L21 10 L21 20 L15 20 L15 14 L9 14 L9 20 L3 20 Z" />,
    plus:  <path d="M10 4 V16 M4 10 H16" />,
  };
  return (
    <Link to={to} className="card card-hover p-5 flex flex-col items-start gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
        <svg viewBox="0 0 20 20" className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icons[icon]}
        </svg>
      </div>
      <span className="font-medium text-slate-900 text-sm">{label}</span>
    </Link>
  );
}
