const PROXY_HOSTS = ['jijistatic.com', 'untera.io'];
const VITE_API = (import.meta as any).env?.VITE_API_URL as string | undefined;

export function imageSrc(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;

  try {
    const u = new URL(raw);
    if (PROXY_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) {
      // In dev: use Vite's /api proxy → localhost:3001/img
      // In prod: use VITE_API directly → railway.app/img
      const prefix = VITE_API ? VITE_API : '/api';
      return `${prefix}/img?url=${encodeURIComponent(raw)}`;
    }
    return raw;
  } catch {
    return raw;
  }
}
