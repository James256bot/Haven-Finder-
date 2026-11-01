import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { VideoInspectionButton } from '../components/VideoInspectionButton';
import { MessageOwnerButton } from '../components/MessageOwnerButton';
import { ViewingForm } from '../components/ViewingForm';
import { ReportButton } from '../components/ReportButton';
import { PropertyVideoGenerator } from '../components/PropertyVideoGenerator';
import { FavoriteButton } from '../components/FavoriteButton';

const API = (import.meta.env.VITE_API as string) || 'http://localhost:3001';

export function PropertyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [listing, setListing] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API}/listings/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (json.success) setListing(json.data.listing);
        else setError(json.error?.message || 'Failed to load');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="p-10 text-center">Loading listing...</div>;
  if (error) return <div className="p-10 text-center"><p className="text-red-600 mb-4">Error: {error}</p><Link to="/" className="text-brand-600 underline">Back to home</Link></div>;
  if (!listing) return <div className="p-10 text-center">Listing not found.</div>;

  // Every value has a safe fallback so the page can't crash
  const safeTitle = listing.title || 'Untitled property';
  const safePhone = listing.owner_phone || '256700000000';
  const safePrice = listing.price_amount != null ? Number(listing.price_amount) : null;
  const safeCurrency = listing.currency || 'UGX';
  const safeSlug = listing.slug || slug || '';
  const safeId = listing.id || '';
  const safeImage = listing.main_image_url && typeof listing.main_image_url === 'string' ? listing.main_image_url : null;
  const safeCity = listing.city || '';
  const safeCountry = listing.country || '';
  const safeLocation = [safeCity, safeCountry].filter(Boolean).join(', ') || 'Location not specified';
  const safeDescription = listing.description && typeof listing.description === 'string' ? listing.description : 'No description provided.';

  return (
    <div className="container-page py-8 max-w-5xl mx-auto">
      <Link to="/" className="text-brand-600 hover:underline mb-4 inline-block">&larr; Back to home</Link>
      
      <div className="flex justify-between items-start mb-2 gap-4">
        <h1 className="text-3xl font-bold text-slate-900">{safeTitle}</h1>
        {safeId && <FavoriteButton listingId={safeId} variant="overlay" size="lg" />}
      </div>
      <p className="text-slate-500 mb-6">{safeLocation}</p>
      
      <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-video mb-6">
        {safeImage ? (
          <img src={safeImage} alt={safeTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">No image available</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{listing.bedrooms ?? '—'}</p>
          <p className="text-sm text-slate-500">Bedrooms</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{listing.bathrooms ?? '—'}</p>
          <p className="text-sm text-slate-500">Bathrooms</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold">{listing.property_type || '—'}</p>
          <p className="text-sm text-slate-500">Type</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">About this property</h2>
            <p className="text-slate-700 whitespace-pre-wrap">{safeDescription}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Price</h2>
            <p className="text-3xl font-bold text-emerald-600 mb-6">
              {safePrice != null ? `${safeCurrency} ${safePrice.toLocaleString()}` : 'Price on request'}
              {listing.price_period === 'monthly' && <span className="text-lg text-slate-500 font-normal">/month</span>}
            </p>

            <div className="space-y-3">
              <WhatsAppButton
                phone={safePhone}
                listingTitle={safeTitle}
                listingSlug={safeSlug}
                listingId={safeId}
                city={safeCity}
              />
              <VideoInspectionButton
                phone={safePhone}
                listingTitle={safeTitle}
                listingSlug={safeSlug}
                listingId={safeId}
                city={safeCity}
              />
              <PropertyVideoGenerator listing={listing} />
              <MessageOwnerButton listingId={safeId} listingTitle={safeTitle} />
              <ViewingForm listingId={safeId} listingTitle={safeTitle} />
            </div>

            <div className="mt-4 text-center">
              <ReportButton listingId={safeId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
