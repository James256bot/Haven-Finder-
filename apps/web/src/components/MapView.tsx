import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { PriceDisplay } from './PriceDisplay';
import { VerificationBadge } from './VerificationBadge';
import { imageSrc } from '../utils/image-url';
import type { MapPin } from '../types';

export type Cluster = {
  lat: number;
  lng: number;
  count: number;
  minPriceUsd: number;
  minPriceAmount: string | null;
  currency: string | null;
  pricePeriod: string | null;
  verification: string | null;
  sampleId: string;
  sampleSlug: string;
  sampleTitle: string | null;
  sampleImage: string | null;
  countryCode: string | null;
  city: string | null;
};

function formatShort(amount?: string | number | null, currency?: string | null) {
  if (amount === undefined || amount === null || !currency) return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (n >= 1_000_000_000) return `${currency} ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${currency} ${Math.round(n / 1_000)}K`;
  return `${currency} ${n}`;
}

function makePriceIcon(pin: MapPin) {
  const price = formatShort(pin.price_amount, pin.currency);
  const color =
    pin.verification === 'verified' ? '#059669' :
    pin.source_code ? '#0ea5e9' : '#475569';
  return L.divIcon({
    className: 'hf-pin',
    html: `<div style="background:${color}; color:white; padding:4px 9px; border-radius:9999px; font-size:12px; font-weight:700; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,.28); transform:translate(-50%,-100%); border:2px solid white;">${price}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function makeClusterIcon(cluster: Cluster) {
  const count = cluster.count;
  const size = count >= 100 ? 60 : count >= 20 ? 52 : count >= 5 ? 44 : 38;
  const price = formatShort(cluster.minPriceAmount, cluster.currency);
  return L.divIcon({
    className: 'hf-cluster',
    html: `
      <div style="
        width:${size}px; height:${size}px;
        border-radius:50%;
        background: radial-gradient(circle at 30% 30%, #5482ff, #0646cc);
        color:white; display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        font-family: Sora, Inter, sans-serif;
        font-weight:800; font-size:13px; line-height:1;
        border:3px solid white;
        box-shadow:0 4px 12px rgba(10,92,255,.35);
        cursor:pointer;
        transform:translate(-50%,-50%);
      ">
        <span>${count}</span>
        <span style="font-size:9px; opacity:.85; margin-top:2px; font-weight:600;">${price}</span>
      </div>`,
    iconSize: L.point(size, size),
    iconAnchor: [0, 0],
  });
}

// Emits zoom changes so parent can refetch clusters
function ZoomTracker({ onChange }: { onChange: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onChange(map.getZoom()),
  });
  useEffect(() => { onChange(map.getZoom()); }, [map, onChange]);
  return null;
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [points, map]);
  return null;
}

type Mode = 'pins' | 'clusters';

export function MapView({
  pins,
  clusters,
  mode = 'pins',
  height = '600px',
  onZoomChange,
  onClusterClick,
}: {
  pins?: MapPin[];
  clusters?: Cluster[];
  mode?: Mode;
  height?: string;
  onZoomChange?: (zoom: number) => void;
  onClusterClick?: (cluster: Cluster) => void;
}) {
  const center: [number, number] = (pins && pins.length > 0)
    ? [pins[0].latitude, pins[0].longitude]
    : (clusters && clusters.length > 0)
      ? [clusters[0].lat, clusters[0].lng]
      : [0.3136, 32.5811];

  const fitPoints = mode === 'pins'
    ? (pins ?? []).map(p => ({ lat: p.latitude, lng: p.longitude }))
    : (clusters ?? []).map(c => ({ lat: c.lat, lng: c.lng }));

  return (
    <div className="rounded-2xl overflow-hidden border border-ink-200 bg-white shadow-soft" style={{ height }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBounds points={fitPoints} />
        {onZoomChange && <ZoomTracker onChange={onZoomChange} />}

        {mode === 'pins' && (pins ?? []).map(pin => (
          <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={makePriceIcon(pin)}>
            <Popup maxWidth={280} minWidth={260}>
              <div className="space-y-2">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-ink-100 -m-1 mb-2">
                  <img
                    src={imageSrc(pin.main_image_url) || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-snug text-ink-900 line-clamp-2">{pin.title}</h4>
                  <VerificationBadge state={pin.verification} source={pin.source_code} />
                </div>
                <p className="text-xs text-ink-500">{[pin.city, pin.country_code].filter(Boolean).join(', ')}</p>
                <div className="text-sm font-semibold">
                  <PriceDisplay amount={pin.price_amount} currency={pin.currency} period={pin.price_period} />
                </div>
                <Link
                  to={`/property/${pin.slug}`}
                  className="block text-center mt-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                >
                  Quick view
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}

        {mode === 'clusters' && (clusters ?? []).map((c, i) => (
          <Marker
            key={`cluster-${i}`}
            position={[c.lat, c.lng]}
            icon={makeClusterIcon(c)}
            eventHandlers={{ click: () => onClusterClick?.(c) }}
          >
            <Popup maxWidth={300} minWidth={260}>
              <div className="space-y-2">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-ink-100 -m-1 mb-2">
                  <img
                    src={imageSrc(c.sampleImage) || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                    {c.count} propert{c.count === 1 ? 'y' : 'ies'}
                  </p>
                  <p className="text-xs text-ink-500">{[c.city, c.countryCode].filter(Boolean).join(', ')}</p>
                </div>
                <h4 className="font-semibold text-sm text-ink-900 line-clamp-2">{c.sampleTitle}</h4>
                <p className="text-sm">
                  From <span className="font-bold">{formatShort(c.minPriceAmount, c.currency)}</span>
                </p>
                <Link
                  to={`/search?country=${c.countryCode ?? ''}&lat=${c.lat}&lng=${c.lng}`}
                  className="block text-center mt-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                >
                  View these properties
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
