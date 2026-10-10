const STORAGE_KEY = 'hf_recently_viewed';
const MAX_ITEMS = 10;

export type RecentItem = {
  id: string;
  slug: string;
  title: string;
  price_amount: string | null;
  currency: string | null;
  price_period: string | null;
  main_image_url: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | null;
  viewedAt: number;
};

export function getRecentlyViewed(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function trackView(item: Omit<RecentItem, 'viewedAt'>) {
  try {
    const current = getRecentlyViewed().filter(x => x.id !== item.id);
    const next: RecentItem[] = [{ ...item, viewedAt: Date.now() }, ...current].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function clearRecentlyViewed() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
