import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Notif = {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { setLoading(false); return; }
    fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data.notifications ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    const tk = localStorage.getItem('hf_token');
    if (!tk) return;
    await fetch(`${API}/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tk}` },
    });
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        {items.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="text-sm text-brand-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">No notifications yet.</p>
          <Link to="/search" className="text-brand-600 hover:underline text-sm mt-2 inline-block">
            Browse listings →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.is_read ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{n.title}</p>
                  {n.body && <p className="text-sm text-slate-600 mt-1">{n.body}</p>}
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
