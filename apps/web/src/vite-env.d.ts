/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'react-leaflet-cluster' {
  import type { ReactNode } from 'react';
  const MarkerClusterGroup: (props: any) => JSX.Element;
  export default MarkerClusterGroup;
}
