import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function ViewingForm({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  function token() { return localStorage.getItem('hf_token'); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const tk = token();
    if (!tk) { nav('/login'); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/viewings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tk}`,
        },
        body: JSON.stringify({
          preferredDate: date,
          preferredTime: time,
          message: message || undefined,
          contactPhone: phone || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Request failed');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
        <p className="text-emerald-800 font-medium">Request sent!</p>
        <p className="text-emerald-700 text-sm mt-1">
          The owner will review and confirm shortly.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
      >
        Request a viewing
      </button>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 p-4 bg-white">
      <p className="text-sm text-slate-600">
        Request a viewing for <strong>{listingTitle}</strong>
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Preferred date</label>
        <input
          type="date"
          required
          min={today}
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Preferred time</label>
        <input
          type="time"
          required
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+256..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Message (optional)</label>
        <textarea
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="I'd like to see the property this weekend..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium"
        >
          {loading ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  );
}
