import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

type Msg = {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
};

type Convo = {
  id: string;
  listing_slug: string | null;
  listing_title: string | null;
  main_image_url: string | null;
  other_id: string | null;
  other_name: string | null;
};

export function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [convo, setConvo] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const tk = () => localStorage.getItem('hf_token') ?? '';
  const myId = (() => {
    try {
      const t = tk();
      if (!t) return null;
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload.sub as string;
    } catch { return null; }
  })();

  async function load() {
    const res = await fetch(`${API}/conversations/${id}`, { headers: { Authorization: `Bearer ${tk()}` } });
    const j = await res.json();
    if (!j.success) { nav('/messages'); return; }
    setConvo(j.data.conversation);
    setMsgs(j.data.messages);
    fetch(`${API}/conversations/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${tk()}` } }).catch(() => {});
  }

  useEffect(() => {
    if (!tk()) { nav('/login'); return; }
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await fetch(`${API}/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ content: text }),
      });
      setText('');
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div className="container-page max-w-3xl h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      {convo && (
        <div className="flex items-center gap-3 py-4 border-b border-slate-200 flex-shrink-0">
          <Link to="/messages" className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5 L7 10 L12 15" />
            </svg>
          </Link>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
            {convo.main_image_url && <img src={convo.main_image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{convo.other_name ?? 'Owner'}</p>
            {convo.listing_slug && (
              <Link to={`/property/${convo.listing_slug}`} className="text-xs text-brand-600 hover:underline truncate block">
                {convo.listing_title}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">Start the conversation below</p>
          </div>
        )}
        {msgs.map(m => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                mine
                  ? 'bg-brand-600 text-white rounded-br-sm shadow-sm shadow-brand-600/20'
                  : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm shadow-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? 'text-brand-100' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="py-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          className="input"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="btn btn-primary btn-md flex-shrink-0"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
            <path d="M2 10 L18 3 L15 10 L18 17 Z" />
          </svg>
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
