import { useEffect } from 'react';
import { useFavorites } from '../stores/favorites';
import { useToast } from './Toast';

export function FavoriteButton({
  listingId,
  size = 'md',
  variant = 'overlay',
}: {
  listingId: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'overlay' | 'inline';
}) {
  const ids = useFavorites(s => s.ids);
  const loaded = useFavorites(s => s.loaded);
  const load = useFavorites(s => s.load);
  const toggle = useFavorites(s => s.toggle);
  const { show } = useToast();

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const active = ids.has(listingId);

  const dims =
    size === 'sm' ? 'w-8 h-8' :
    size === 'lg' ? 'w-12 h-12' :
    'w-10 h-10';
  const icon =
    size === 'sm' ? 'w-4 h-4' :
    size === 'lg' ? 'w-6 h-6' :
    'w-5 h-5';

  if (variant === 'overlay') {
    return (
      <button
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const r = await toggle(listingId);
          if (r.ok) show(r.favorited ? 'Saved to favorites' : 'Removed from favorites', 'success');
          else show(`Error: ${(r as any).error ?? 'unknown'}`, 'error');
        }}
        aria-label={active ? 'Remove from favorites' : 'Save to favorites'}
        className={`${dims} rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center hover:scale-110 transition-transform`}
      >
        <svg
          className={`${icon} ${active ? 'text-red-500' : 'text-slate-400'} transition-colors`}
          viewBox="0 0 24 24"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={async () => {
        const r = await toggle(listingId);
        if (r.ok) show(r.favorited ? 'Saved to favorites' : 'Removed from favorites', 'success');
        else show(`Error: ${(r as any).error ?? 'unknown'}`, 'error');
      }}
      className={`w-full px-4 py-3 rounded-xl border font-medium transition-colors flex items-center justify-center gap-2 ${
        active
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <svg
        className={`${icon} ${active ? 'text-red-500' : 'text-slate-400'}`}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {active ? 'Saved' : 'Save'}
    </button>
  );
}
