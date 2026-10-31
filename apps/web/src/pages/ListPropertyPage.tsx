import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Seo } from '../components/Seo';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function ListPropertyPage() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [listingType, setListingType] = useState('rent');
  const [city, setCity] = useState('Kampala');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [images, setImages] = useState<any[]>([]);

  const nav = useNavigate();
  const tk = () => localStorage.getItem('hf_token') ?? '';

  async function uploadImage(file: File) {
    if (!listingId) {
      const previewUrl = URL.createObjectURL(file);
      setImages(prev => [...prev, { id: previewUrl, url: previewUrl, file }]);
      return;
    }
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

  function removeImage(id: string) {
    setImages(prev => prev.filter(x => x.id !== id));
  }

  async function publish() {
    if (!title.trim() || !description.trim()) return setError("Title and description are required");
    setBusy(true); setError(null);
    try {
      const createRes = await fetch(`${API}/me/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({ 
          title, 
          description, 
          city, 
          propertyType, 
          listingType, 
          priceAmount: Number(priceAmount) || 1000000,
          bedrooms: Number(bedrooms) || 0,
          bathrooms: Number(bathrooms) || 0
        }),
      });
      const createJ = await createRes.json();
      if (!createJ.success) throw new Error(createJ.error?.message ?? 'Create failed');
      const newListingId = createJ.data.listing.id;

      for (const img of images) {
        const fileToUpload = img instanceof File ? img : img.file;
        if (fileToUpload) {
          const fd = new FormData();
          fd.append('file', fileToUpload);
          await fetch(`${API}/me/listings/${newListingId}/images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tk()}` },
            body: fd,
          });
        }
      }

      const res = await fetch(`${API}/me/listings/${newListingId}/publish`, {
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
      <Seo title="List a Property | HavenFinder" description="List your property on HavenFinder." url="/list" />
      <h1 className="text-3xl font-semibold text-slate-900 mb-2">List your property</h1>
      <p className="text-slate-500 mb-6">Step {step} of 5</p>

      <div className="h-1.5 rounded-full bg-slate-200 mb-8 overflow-hidden">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {step === 1 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Property type</label>
          <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="land">Land</option>
          </select>
          <label className="block text-sm font-medium text-slate-700 mb-2 mt-4">Listing type</label>
          <select value={listingType} onChange={e => setListingType(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">
            <option value="rent">For rent</option>
            <option value="sale">For sale</option>
          </select>
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">City / Area</label>
          <input value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" />
          <label className="block text-sm font-medium text-slate-700 mb-2 mt-4">Price (UGX)</label>
          <input type="number" value={priceAmount} onChange={e => setPriceAmount(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" placeholder="e.g., 1500000" />
        </div>
      )}

      {step === 3 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Bedrooms</label>
          <input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" />
          <label className="block text-sm font-medium text-slate-700 mb-2 mt-4">Bathrooms</label>
          <input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" />
        </div>
      )}

      {step === 4 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Modern 2-bedroom apartment in Ntinda" className="w-full p-3 rounded-xl border border-slate-300" />
          <label className="block text-sm font-medium text-slate-700 mb-2 mt-4">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe the property..." className="w-full p-3 rounded-xl border border-slate-300" />
        </div>
      )}

      {step === 5 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Photos ({images.length})</label>
          
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors mb-4">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-brand-600">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-slate-400">JPG, PNG or WebP (Max 10MB)</p>
            </div>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              className="hidden" 
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { await uploadImage(f); } catch (err: any) { setError(err.message); }
                e.target.value = '';
              }}
            />
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={img.url || img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id || img)}
                    className="absolute top-1 right-1 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium">Back</button>
        )}
        {step < 5 && (
          <button onClick={() => setStep(step + 1)} className="flex-1 px-5 py-3 rounded-xl bg-brand-600 text-white font-medium">Continue</button>
        )}
        {step === 5 && (
          <button onClick={publish} disabled={busy || !title || !description} className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold shadow-lg">
            {busy ? 'Publishing…' : 'Publish listing'}
          </button>
        )}
      </div>
    </div>
  );
}
