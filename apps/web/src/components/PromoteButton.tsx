import { useState } from 'react';

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
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/me/listings/${listingId}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('hf_token') ?? ''}`,
        },
        body: JSON.stringify({ tier: selected, phone: phone || undefined }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');

      const redirectUrl = j.data?.payment?.redirectUrl;
      if (redirectUrl) {
        // Redirect user to DPO hosted checkout
        window.location.href = redirectUrl;
      } else {
        throw new Error('No payment URL returned — check server logs');
      }
    } catch (e: any) {
      setError(e.message);
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Promote this listing</h3>
        {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 mb-3">{error}</div>}

        <div className="space-y-2 mb-4">
          {TIERS.map(t => (
            <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              selected === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
            }`}>
              <input type="radio" checked={selected === t.id} onChange={() => setSelected(t.id)} className="accent-brand-600 mt-1" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-900">{t.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{t.price}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.days} · {t.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Mobile money number (MTN or Airtel)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="256772000001"
            className="w-full px-4 py-3 rounded-xl border border-slate-300"
          />
          <p className="text-xs text-slate-400 mt-1">
            You'll be redirected to DPO's secure checkout to choose MTN, Airtel, or card.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setOpen(false)} disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium disabled:opacity-60">
            {busy ? 'Redirecting…' : 'Continue to payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
