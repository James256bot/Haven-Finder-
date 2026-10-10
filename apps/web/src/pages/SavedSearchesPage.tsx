import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Saved = {
  id: string;
  name: string;
  filters: any;
  created_at: string;
};

export function SavedSearchesPage() {
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { setAuthRequired(true); setLoading(false); return; }
    fetch(`${API}/saved-searches`, { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data.saved ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    const tk = localStorage.getItem('hf_token');
    if (!tk) return;
    await fetch(`${API}/saved-searches/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk}` },
    });
    setItems(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;

  if (authRequired) return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-3">Saved searches</h1>
      <p className="text-slate-600 mb-4">Sign in to see your saved searches.</p>
      <Link to="/login" className="inline-block px-4 py-2 rounded-lg bg-brand-600 text-white">Sign in</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Saved searches</h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">You haven't saved any searches yet.</p>
          <p className="text-sm text-slate-400 mt-1">Search something and tap "Save this search" to get alerts.</p>
          <Link to="/search" className="text-brand-600 hover:underline text-sm mt-3 inline-block">
            Start searching →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(s => {
            const raw = s.filters?.raw ?? s.name;
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Saved {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/search?raw=${encodeURIComponent(raw)}&q=${encodeURIComponent(raw)}`}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
                >
                  Run
                </Link>
                <button
                  onClick={() => remove(s.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  aria-label="Delete"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
