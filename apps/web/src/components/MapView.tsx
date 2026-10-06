import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useEffect } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { PriceDisplay } from './PriceDisplay';
import { VerificationBadge } from './VerificationBadge';
import { imageSrc } from '../utils/image-url';
import type { MapPin } from '../types';

function formatShort(amount?: string | null, currency?: string | null) {
  if (!amount || !currency) return '—';
  const n = Number(amount);
  if (n >= 1_000_000_000) return `${currency} ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${currency} ${Math.round(n / 1_000)}K`;
  return `${currency} ${n}`;
}

function makePinIcon(pin: MapPin) {
  const price = formatShort(pin.price_amount, pin.currency);
  const color =
    pin.verification === 'verified' ? '#059669' :
    pin.source_code                ? '#0ea5e9' : '#475569';
  return L.divIcon({
    className: 'hf-pin',
    html: `<div style="
      background:${color}; color:white; padding:4px 8px;
      border-radius:9999px; font-size:11px; font-weight:600;
      white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.25);
      transform:translate(-50%,-100%);
    ">${price}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map(p => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [pins, map]);
  return null;
}

export function MapView({ pins, height = '600px' }: { pins: MapPin[]; height?: string }) {
  const center: [number, number] = pins.length > 0
    ? [pins[0].latitude, pins[0].longitude]
    : [0.3136, 32.5811];

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBounds pins={pins} />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            const size = count > 100 ? 56 : count > 20 ? 48 : 40;
            return L.divIcon({
              html: `<div style="
                width:${size}px; height:${size}px; border-radius:50%;
                background:rgba(14,165,233,0.9); color:white;
                display:flex; align-items:center; justify-content:center;
                font-weight:700; font-size:13px;
                border:3px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,.25);
              ">${count}</div>`,
              className: 'hf-cluster',
              iconSize: L.point(size, size),
            });
          }}
        >
          {pins.map(pin => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={makePinIcon(pin)}
            >
              <Popup maxWidth={260} minWidth={240}>
                <div className="space-y-2">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 -m-1 mb-2">
                    <img
                      src={imageSrc(pin.main_image_url) || 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm leading-snug text-slate-900 line-clamp-2">
                      {pin.title}
                    </h4>
                    <VerificationBadge state={pin.verification} source={pin.source_code} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {[pin.city, pin.country_code].filter(Boolean).join(', ')}
                  </p>
                  <div className="text-sm">
                    <PriceDisplay amount={pin.price_amount} currency={pin.currency} period={pin.price_period} />
                  </div>
                  <Link
                    to={`/property/${pin.slug}`}
                    className="block text-center mt-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700"
                  >
                    Quick view
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
