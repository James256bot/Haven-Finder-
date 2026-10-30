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
  const [step, setStep] = useState<'form' | 'waiting' | 'success' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null); setStep('form');
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
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');

      // Payment initiated. Now we poll for success.
      setStep('waiting');
      pollStatus(j.data.referenceId);
    } catch (e: any) {
      setError(e.message);
      setStep('error');
      setBusy(false);
    }
  }

  async function pollStatus(refId: string) {
    const maxAttempts = 20; // 20 * 3s = 60 seconds max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`${API}/me/listings/${listingId}/promote/mtn/${refId}/verify`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('hf_token') ?? ''}` },
        });
        const j = await res.json();
        
        if (j.success && j.data.status === 'SUCCESSFUL') {
          setStep('success');
          setTimeout(() => window.location.reload(), 2000);
          return;
        }
        if (j.data?.status === 'FAILED' || !j.success) {
          throw new Error('Payment failed or was cancelled.');
        }
      } catch (e: any) {
        setError(e.message);
        setStep('error');
        setBusy(false);
        return;
      }
    }
    setError('Payment timed out. Check your phone and try again.');
    setStep('error');
    setBusy(false);
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
        
        {step === 'form' && (
          <>
            {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 mb-3">{error}</div>}
            <div className="space-y-2 mb-4">
              {TIERS.map(t => (
                <label key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${selected === t.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                  <input type="radio" name="tier" value={t.id} checked={selected === t.id} onChange={() => setSelected(t.id)} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{t.label}</span>
                      <span className="font-bold text-brand-700">{t.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{t.desc} · {t.days}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">MTN Mobile Money Number</label>
              <input
                type="tel"
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">You will receive a prompt on your phone to enter your PIN.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>
              <button onClick={submit} disabled={busy || !phone} className="flex-1 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {busy ? 'Connecting…' : 'Pay with MTN'}
              </button>
            </div>
          </>
        )}

        {step === 'waiting' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="font-semibold text-slate-900">Check your phone</h4>
            <p className="text-sm text-slate-500 mt-2">Enter your MTN PIN to complete the payment. We'll update this page automatically.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="text-emerald-500 text-4xl mb-2">✓</div>
            <h4 className="font-semibold text-slate-900">Payment Successful!</h4>
            <p className="text-sm text-slate-500 mt-2">Your listing is now boosted. Refreshing...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6">
            <div className="text-red-500 text-4xl mb-2">✗</div>
            <h4 className="font-semibold text-slate-900">Payment Failed</h4>
            <p className="text-sm text-slate-500 mt-2 mb-4">{error}</p>
            <button onClick={() => { setStep('form'); setBusy(false); }} className="px-4 py-2 rounded-lg bg-slate-100 font-medium">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
