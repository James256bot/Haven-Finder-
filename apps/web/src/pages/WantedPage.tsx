import { useState, useEffect } from 'react';
import { Seo } from '../components/Seo';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function WantedPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Kampala');
  const [bedrooms, setBedrooms] = useState('2');
  const [maxPrice, setMaxPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/wanted`)
      .then(r => r.json())
      .then(j => { if (j.success) setRequests(j.data.requests); })
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/wanted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, city, bedrooms: Number(bedrooms), maxPrice: Number(maxPrice) || undefined, contactPhone: phone, contactEmail }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setShowForm(false);
      setTitle(''); setPhone(''); setMaxPrice('');
      const fresh = await fetch(`${API}/wanted`).then(r => r.json());
      if (fresh.success) setRequests(fresh.data.requests);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-8">
      <Seo title="Property Wanted | HavenFinder" description="Tell agents what you're looking for." url="/wanted" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Property Wanted</h1>
          <p className="text-slate-500 text-sm mt-1">Renters looking for a home. Agents, find your next client.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700">
          {showForm ? 'Cancel' : '+ Post a Request'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-900">What are you looking for?</h2>
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., 2 bedroom apartment in Ntinda" className="w-full p-3 rounded-xl border border-slate-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City / Area</label>
              <input required value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label>
              <input type="number" required value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Price (UGX)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g., 1000000" className="w-full p-3 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label>
              <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="256..." className="w-full p-3 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (for property alerts)</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@example.com" className="w-full p-3 rounded-xl border border-slate-300" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">
            {submitting ? 'Posting...' : 'Post Request'}
          </button>
        </form>
      )}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No requests yet. Be the first to post what you're looking for.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map((r: any) => (
            <div key={r.id} className="card p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-900">{r.title}</h3>
                <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-500">
                📍 {r.city} · 🛏 {r.bedrooms} beds {r.max_price ? `· 💰 max ${Number(r.max_price).toLocaleString()} UGX` : ''}
              </p>
              <a href={`https://wa.me/${r.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I saw your request on HavenFinder for "${r.title}". I have a property that might interest you.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-medium">
                💬 Contact Renter
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
