import { create } from 'zustand';

type FavState = {
  ids: Set<string>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (listingId: string) => Promise<{ favorited: boolean; ok: boolean }>;
  isFav: (listingId: string) => boolean;
};

export const useFavorites = create<FavState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  load: async () => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) { set({ ids: new Set(), loaded: true }); return; }
    try {
      const res = await fetch('/api/me/favorites/ids', {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const j = await res.json();
      if (j.success) set({ ids: new Set(j.data.ids), loaded: true });
    } catch { set({ loaded: true }); }
  },

  toggle: async (listingId: string) => {
    const tk = localStorage.getItem('hf_token');
    if (!tk) {
      window.location.href = '/login';
      return { favorited: false, ok: false };
    }
    const current = new Set(get().ids);
    const wasFav = current.has(listingId);

    if (wasFav) current.delete(listingId);
    else current.add(listingId);
    set({ ids: current });

    try {
      const res = await fetch(`/api/listings/${listingId}/favorite`, {
        method: wasFav ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error('Failed');
      return { favorited: !wasFav, ok: true };
    } catch {
      const revert = new Set(get().ids);
      if (wasFav) revert.add(listingId);
      else revert.delete(listingId);
      set({ ids: revert });
      return { favorited: wasFav, ok: false };
    }
  },

  isFav: (listingId: string) => get().ids.has(listingId),
}));
