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
    <div className="container-page py-8 sm:py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="h1 text-slate-900">Messages</h1>
        <p className="text-slate-500 text-sm mt-1">Conversations with owners and renters</p>
      </div>

      {error && <EmptyState title="Could not load" message={error} />}
      {!items && !error && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      )}
      {items && items.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12 A8 8 0 1 1 12 4 L21 4 L21 12 Z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium text-lg">No conversations yet</p>
          <p className="text-slate-500 text-sm mt-1">Message an owner about any property to get started.</p>
          <Link to="/search" className="btn btn-primary btn-md mt-6 inline-flex">Browse properties</Link>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="space-y-2">
          {items.map(c => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className="card card-hover p-4 flex items-center gap-4 group"
            >
              <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                {c.main_image_url
                  ? <img src={c.main_image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">—</div>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
                    {c.other_name ?? 'Owner'}
                  </span>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{c.listing_title ?? c.subject}</p>
                <p className="text-sm text-slate-600 truncate mt-1">{c.last_message_preview ?? ''}</p>
              </div>

              {c.unread > 0 && (
                <span className="flex-shrink-0 bg-brand-600 text-white text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
