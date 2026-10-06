import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

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
    const res = await fetch(`/api/conversations/${id}`, { headers: { Authorization: `Bearer ${tk()}` } });
    const j = await res.json();
    if (!j.success) { nav('/messages'); return; }
    setConvo(j.data.conversation);
    setMsgs(j.data.messages);
    fetch(`/api/conversations/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${tk()}` } }).catch(() => {});
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
      await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ content: text }),
      });
      setText('');
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-64px)]">
      {convo && (
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <Link to="/messages" className="text-slate-500 hover:text-slate-900">←</Link>
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100">
            {convo.main_image_url && <img src={convo.main_image_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{convo.other_name ?? 'Owner'}</p>
            {convo.listing_slug && (
              <Link to={`/property/${convo.listing_slug}`} className="text-xs text-brand-600 hover:underline truncate block">
                {convo.listing_title}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {msgs.map(m => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                mine ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? 'text-brand-100' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="pt-4 border-t border-slate-200 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300"
        />
        <button type="submit" disabled={busy || !text.trim()}
          className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium">
          Send
        </button>
      </form>
    </div>
  );
}
