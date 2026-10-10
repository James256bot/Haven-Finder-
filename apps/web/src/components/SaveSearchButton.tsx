import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function SaveSearchButton() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'login'>('idle');
  const [errMsg, setErrMsg] = useState<string>('');

  const raw = params.get('raw') ?? params.get('q') ?? '';

  if (!raw.trim()) return null;

  async function save() {
    const token = localStorage.getItem('hf_token');
    if (!token) {
      setErrMsg('No token — sign in first');
      setState('login');
      return;
    }

    setState('saving');
    setErrMsg('');

    try {
      const filters: Record<string, string> = {};
      ['bedrooms', 'maxPrice', 'minPrice', 'propertyType', 'listingType', 'city', 'country'].forEach(k => {
        const v = params.get(k);
        if (v) filters[k] = v;
      });

      const url = `${API}/saved-searches`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ raw, name: raw, filters }),
      });

      const text = await res.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch {
        setErrMsg(`HTTP ${res.status} — non-JSON: ${text.slice(0, 40)}`);
        setState('error');
        return;
      }

      if (!res.ok || !j.success) {
        setErrMsg(`HTTP ${res.status} — ${j?.error?.message ?? 'failed'}`);
        setState('error');
        return;
      }
      setState('saved');
    } catch (err: any) {
      setErrMsg(`Network — ${err?.message ?? 'unknown'}`);
      setState('error');
    }
  }

  if (state === 'login') {
    return (
      <div className="text-sm text-red-600">
        {errMsg} — <a href="/login" className="underline">go to login</a>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={save}
        disabled={state === 'saving' || state === 'saved'}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          state === 'saved'
            ? 'bg-emerald-100 text-emerald-700'
            : state === 'error'
            ? 'bg-red-50 text-red-700 border border-red-300'
            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {state === 'idle' && '🔔 Save this search'}
        {state === 'saving' && 'Saving…'}
        {state === 'saved' && "✓ Saved — you'll be notified"}
        {state === 'error' && 'Tap to retry'}
      </button>
      {state === 'error' && errMsg && (
        <div className="mt-2 text-xs text-red-600 font-mono break-all">
          {errMsg}
        </div>
      )}
    </div>
  );
}
