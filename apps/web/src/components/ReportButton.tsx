import { useState } from 'react';
import { useToast } from './Toast';

const REASONS = [
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'wrong_price', label: 'Wrong price' },
  { value: 'fake_property', label: 'Fake or non-existent property' },
  { value: 'incorrect_location', label: 'Incorrect location' },
  { value: 'duplicate', label: 'Duplicate listing' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Other' },
];

export function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('scam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const tk = localStorage.getItem('hf_token');
    if (!tk) { show('Sign in to report', 'info'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ reason, details }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      show('Report submitted. Thank you.', 'success');
      setOpen(false);
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-ink-500 hover:text-red-600 underline">
        Report this listing
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900 text-sm">Report listing</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">×</button>
      </div>
      <select value={reason} onChange={e => setReason(e.target.value)} className="input">
        {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <textarea
        value={details}
        onChange={e => setDetails(e.target.value)}
        placeholder="Additional details (optional)"
        rows={3}
        className="input"
      />
      <button type="submit" disabled={busy} className="btn btn-primary btn-md w-full">
        {busy ? 'Submitting…' : 'Submit report'}
      </button>
    </form>
  );
}
