import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

const PROPERTY_TYPES = [
  'apartment','house','villa','condo','studio','room','hostel','guest_house',
  'office','shop','warehouse','restaurant_space','commercial_building',
  'land','farm','event_venue','hotel','lodge',
];
const LISTING_TYPES = [
  { value: 'rent', label: 'For rent' },
  { value: 'sale', label: 'For sale' },
  { value: 'short_stay', label: 'Short stay' },
  { value: 'commercial_lease', label: 'Commercial lease' },
  { value: 'land_sale', label: 'Land sale' },
];
const PERIODS = [
  { value: 'monthly', label: 'per month' },
  { value: 'nightly', label: 'per night' },
  { value: 'yearly', label: 'per year' },
  { value: 'weekly', label: 'per week' },
  { value: 'total', label: 'total (one-off)' },
];
const CURRENCIES = ['UGX','USD','KES','EUR','GBP'];

export function ListPropertyPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [listingId, setListingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [propertyType, setPropertyType] = useState('apartment');
  const [listingType, setListingType] = useState('rent');
  const [city, setCity] = useState('Kampala');
  const [addressLine, setAddressLine] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [floorAreaSqm, setFloorAreaSqm] = useState('');
  const [furnishing, setFurnishing] = useState('unfurnished');
  const [priceAmount, setPriceAmount] = useState('');
  const [currency, setCurrency] = useState('UGX');
  const [pricePeriod, setPricePeriod] = useState('monthly');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);

  const tk = () => localStorage.getItem('hf_token') ?? '';

  if (!localStorage.getItem('hf_token')) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to list a property</h1>
        <button onClick={() => nav('/login')} className="mt-6 px-6 py-3 rounded-xl bg-brand-600 text-white font-medium">
          Sign in
        </button>
      </div>
    );
  }

  async function createDraft() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API}/me/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          title: title || 'Untitled draft',
          description: description || 'Draft listing — description pending.',
          propertyType,
          listingType,
          city,
          addressLine: addressLine || undefined,
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          floorAreaSqm: floorAreaSqm ? Number(floorAreaSqm) : undefined,
          furnishing,
          priceAmount: Number(priceAmount) || 1,
          currency,
          pricePeriod,
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Failed');
      setListingId(j.data.listing.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (!listingId) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/me/listings/${listingId}/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tk()}` },
      body: fd,
    });
    const j = await res.json();
    if (!j.success) throw new Error(j.error?.message ?? 'Upload failed');
    setImages(prev => [...prev, j.data.image]);
  }

  async function removeImage(id: string) {
    if (!listingId) return;
    await fetch(`${API}/me/listings/${listingId}/images/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk()}` },
    });
    setImages(prev => prev.filter(x => x.id !== id));
  }

  async function publish() {
    if (!listingId) return;
    setBusy(true); setError(null);
    try {
      await fetch(`${API}/me/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ title, description }),
      });
      const res = await fetch(`${API}/me/listings/${listingId}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tk()}` },
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error?.message ?? 'Publish failed');
      nav('/my-listings');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold text-slate-900 mb-2">List your property</h1>
      <p className="text-slate-500 mb-6">Step {step} of 5</p>

      <div className="h-1.5 rounded-full bg-slate-200 mb-8 overflow-hidden">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3 mb-6">{error}</div>}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Property type</label>
            <select value={propertyType} onChange={e => setPropertyType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white">
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Listing type</label>
            <div className="space-y-2">
              {LISTING_TYPES.map(t => (
                <label key={t.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={listingType === t.value}
                    onChange={() => setListingType(t.value)} className="accent-brand-600" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Address / neighborhood</label>
            <input value={addressLine} onChange={e => setAddressLine(e.target.value)}
              placeholder="e.g. Ntinda, near Capital Shoppers"
              className="w-full px-4 py-3 rounded-xl border border-slate-300" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bedrooms</label>
              <input type="number" min={0} value={bedrooms} onChange={e => setBedrooms(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bathrooms</label>
              <input type="number" min={0} step={0.5} value={bathrooms} onChange={e => setBathrooms(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Floor area (sqm)</label>
            <input type="number" min={0} value={floorAreaSqm} onChange={e => setFloorAreaSqm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Furnishing</label>
            <select value={furnishing} onChange={e => setFurnishing(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white">
              <option value="unfurnished">Unfurnished</option>
              <option value="semi_furnished">Semi-furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="grid grid-cols-[1fr_120px] gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Price</label>
              <input type="number" min={0} value={priceAmount} onChange={e => setPriceAmount(e.target.value)}
                placeholder="1500000" className="w-full px-4 py-3 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Period</label>
            <select value={pricePeriod} onChange={e => setPricePeriod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white">
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          {!listingId ? (
            <button onClick={createDraft} disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-brand-600 text-white font-medium disabled:opacity-60">
              {busy ? 'Creating…' : 'Create draft to enable photo upload'}
            </button>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Modern 2-bedroom apartment in Ntinda"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the property, amenities, neighborhood..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Photos ({images.length})</label>
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try { await uploadImage(f); } catch (err: any) { setError(err.message); }
                    e.target.value = '';
                  }}
                  className="block w-full text-sm text-slate-500" />
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {images.map(img => (
                      <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/90 text-slate-700 flex items-center justify-center text-lg leading-none hover:bg-red-50 hover:text-red-600">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-10 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)}
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium">
            Back
          </button>
        )}
        {step < 5 && (
          <button onClick={() => setStep(step + 1)}
            className="flex-1 px-5 py-3 rounded-xl bg-brand-600 text-white font-medium">
            Continue
          </button>
        )}
        {step === 5 && listingId && (
          <button onClick={publish} disabled={busy || !title || !description || images.length === 0}
            className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium">
            {busy ? 'Publishing…' : 'Publish listing'}
          </button>
        )}
      </div>
    </div>
  );
}
