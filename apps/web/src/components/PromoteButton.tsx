import { useState } from 'react';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

const TIERS = [
  { id: 'boost',    label: 'Boost',    price: 'UGX 10,000', days: '7 days',  desc: 'Top of neighborhood search' },
  { id: 'featured', label: 'Featured', price: 'UGX 30,000', days: '14 days', desc: 'Homepage + search results' },
  { id: 'premium',  label: 'Premium',  price: 'UGX 80,000', days: '30 days', desc: 'All of the above + review' },
] as const;

export function PromoteButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>('boost');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!phone.trim()) { setError('Phone number is required'); return; }
    setBusy(true); setError(null); setMessage(null);

    try {
      const res = await fetch(`${API}/me/listings/${listingId}/promote/mtn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('hf_token') ?? ''}`,
        },
        body: JSON.stringify({ tier: selected, phone }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Payment failed');

      setMessage(j.data.message || 'Check your phone for the MTN prompt.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 text-xs font-medium hover:bg-brand-100">
        Promote
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !busy && setOpen(false)}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Promote your listing</h3>

        <div className="space-y-2 mb-4">
          {TIERS.map(t => (
            <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${selected === t.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}>
              <input type="radio" name="tier" value={t.id} checked={selected === t.id} onChange={e => setSelected(e.target.value)} />
              <div className="flex-1">
                <p className="font-medium text-slate-900 text-sm">{t.label} — {t.price}</p>
                <p className="text-xs text-slate-500">{t.desc} · {t.days}</p>
              </div>
            </label>
          ))}
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-2">MTN Phone Number</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g., 256771234567"
          className="w-full p-3 rounded-xl border border-slate-300 mb-4"
        />

        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mb-3">{error}</div>}
        {message && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg mb-3">{message}</div>}

        <div className="flex gap-3">
          <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 px-4 py-2 rounded-xl bg-brand-600 text-white font-medium">
            {busy ? 'Sending...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
