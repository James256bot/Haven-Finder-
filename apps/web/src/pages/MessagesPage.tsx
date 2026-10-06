import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

type Convo = {
  id: string;
  listing_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  listing_slug: string | null;
  listing_title: string | null;
  main_image_url: string | null;
  unread: number;
  other_name: string | null;
  other_id: string | null;
};

export function MessagesPage() {
  const [items, setItems] = useState<Convo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { nav('/login'); return; }
    fetch('/api/me/conversations', { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(j => { if (!j.success) throw new Error(j.error?.message); setItems(j.data.conversations); })
      .catch(e => setError(e.message));
  }, [nav]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold text-slate-900 mb-6">Messages</h1>
      {error && <EmptyState title="Could not load" message={error} />}
      {!items && !error && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}</div>}
      {items && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No conversations yet.</p>
          <Link to="/search" className="inline-block mt-4 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">Browse properties</Link>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="space-y-2">
          {items.map(c => (
            <Link key={c.id} to={`/messages/${c.id}`}
              className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-300 transition-colors">
              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {c.main_image_url && <img src={c.main_image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900 truncate">{c.other_name ?? 'Owner'}</span>
                  {c.unread > 0 && (
                    <span className="text-xs bg-brand-600 text-white rounded-full px-2 py-0.5 font-medium">{c.unread}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{c.listing_title ?? c.subject}</p>
                <p className="text-sm text-slate-600 truncate mt-1">{c.last_message_preview ?? ''}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
