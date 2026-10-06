const PROXY_HOSTS = [
  'jijistatic.com',
  'untera.io',
];

export function imageSrc(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('/api/')) return raw;
  try {
    const u = new URL(raw);
    if (PROXY_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) {
      return `/api/img?url=${encodeURIComponent(raw)}`;
    }
    return raw;
  } catch {
    return raw;
  }
}
