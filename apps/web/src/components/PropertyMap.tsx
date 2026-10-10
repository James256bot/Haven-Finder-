import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom blue pin (avoids missing default icon assets)
function makePinIcon() {
  return L.divIcon({
    className: 'hf-property-pin',
    html: `
      <div style="
        width: 32px; height: 32px;
        background: #0a5cff;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 12px rgba(0,0,0,0.35);
        position: relative;
      ">
        <div style="
          position: absolute; inset: 6px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

export function PropertyMap({
  lat,
  lng,
  height = '340px',
}: {
  lat: number;
  lng: number;
  height?: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Approximate area circle — privacy */}
        <Circle
          center={[lat, lng]}
          radius={200}
          pathOptions={{
            color: '#0a5cff',
            fillColor: '#0a5cff',
            fillOpacity: 0.12,
            weight: 2,
          }}
        />
        <Marker position={[lat, lng]} icon={makePinIcon()} />
      </MapContainer>
    </div>
  );
}
