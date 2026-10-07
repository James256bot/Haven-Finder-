import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../services/api';
import { MapView, type Cluster } from '../components/MapView';
import { EmptyState } from '../components/EmptyState';
import { Seo } from '../components/Seo';

const COUNTRIES = [
  { code: '',   label: 'All countries' },
  { code: 'UG', label: 'Uganda' },
  { code: 'KE', label: 'Kenya' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'TZ', label: 'Tanzania' },
  { code: 'GR', label: 'Greece' },
  { code: 'PT', label: 'Portugal' },
  { code: 'IT', label: 'Italy' },
  { code: 'MX', label: 'Mexico' },
  { code: 'JP', label: 'Japan' },
];

export function MapPage() {
  const [country, setCountry] = useState('UG');
  const [zoom, setZoom] = useState(10);
  const [clusterView, setClusterView] = useState<Cluster[] | null>(null);

  const pins = useQuery({
    queryKey: ['map-pins', country, zoom],
    queryFn: () => api.mapPins({ country: country || undefined, limit: 500 }),
    staleTime: 60_000,
  });

  const clusters = useQuery({
    queryKey: ['map-clusters', country, Math.floor(zoom / 2)],
    queryFn: async () => {
      const res = await fetch(
        `/api/listings/map/clusters?zoom=${zoom}&limit=800${country ? `&country=${country}` : ''}`,
      );
      const j = await res.json();
      return j.success ? (j.data.clusters as Cluster[]) : [];
    },
    staleTime: 60_000,
  });

  const totalCount = (clusters.data ?? []).reduce((sum, c) => sum + c.count, 0);
  const showClusters = zoom < 12 && (clusters.data?.length ?? 0) > 0;

  return (
    <>
      <Seo
        title="Map view"
        description="Explore properties on an interactive map across Uganda, Kenya, Nigeria, and more."
        url="/map"
      />

      <div className="sticky top-24 z-30 bg-white/90 backdrop-blur-md border-b border-ink-200">
        <div className="container-page py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="h3 text-ink-900">Map</h1>
              <span className="hidden sm:inline text-sm text-ink-500">
                {totalCount.toLocaleString()} properties
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Country selector */}
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-ink-300 text-sm font-medium bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>

              {/* Zoom level indicator */}
              <span className="text-xs text-ink-500 hidden md:inline">
                Zoom {Math.round(zoom)} · {showClusters ? 'clusters' : 'pins'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        {pins.isError && <EmptyState title="Couldn't load map" message={String(pins.error)} />}

        {showClusters && (
          <div className="mb-4 text-sm text-ink-500 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
            </svg>
            Zoom in to see individual properties · {clusters.data?.length} cluster{clusters.data?.length === 1 ? '' : 's'}
          </div>
        )}

        <MapView
          mode={showClusters ? 'clusters' : 'pins'}
          clusters={showClusters ? (clusters.data ?? []) : undefined}
          pins={!showClusters ? (pins.data?.pins ?? []) : undefined}
          height="78vh"
          onZoomChange={setZoom}
          onClusterClick={(c) => {
            // Could zoom into the cluster; for now it's handled via popup link
          }}
        />
      </div>
    </>
  );
}
