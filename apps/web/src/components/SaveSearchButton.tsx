import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function SaveSearchButton() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'login'>('idle');

  const raw = params.get('raw') ?? params.get('q') ?? '';

  if (!raw.trim()) return null;

  async function save() {
    const token = localStorage.getItem('hf_token');
    if (!token) { setState('login'); return; }

    setState('saving');
    try {
      const filters: Record<string, string> = {};
      ['bedrooms', 'maxPrice', 'minPrice', 'propertyType', 'listingType', 'city', 'country'].forEach(k => {
        const v = params.get(k);
        if (v) filters[k] = v;
      });

      const res = await fetch(`${API}/saved-searches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ raw, name: raw, filters }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setState('saved');
    } catch {
      setState('error');
    }
  }

  if (state === 'login') {
    return (
      <a href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm">
        Sign in to save this search
      </a>
    );
  }

  return (
    <button
      onClick={save}
      disabled={state === 'saving' || state === 'saved'}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        state === 'saved'
          ? 'bg-emerald-100 text-emerald-700'
          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {state === 'idle' && '🔔 Save this search'}
      {state === 'saving' && 'Saving…'}
      {state === 'saved' && '✓ Saved — you\'ll be notified'}
      {state === 'error' && 'Failed — try again'}
    </button>
  );
}
