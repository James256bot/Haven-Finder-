import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function MessageOwnerButton({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const tk = () => localStorage.getItem('hf_token') ?? '';

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!tk()) { nav('/login'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/listings/${listingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ content: text }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      nav(`/messages/${j.data.conversationId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium transition-colors"
      >
        Message owner
      </button>
    );
  }

  return (
    <form onSubmit={send} className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
      <p className="text-sm text-slate-600">Ask about <strong>{listingTitle}</strong></p>
      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}
      <textarea
        required
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Hi, is this still available?"
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>
        <button type="submit" disabled={busy}
          className="flex-1 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium">
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
