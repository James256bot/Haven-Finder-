import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = (import.meta.env.VITE_API as string) || 'https://havenfinderapi-production.up.railway.app';

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const tk = localStorage.getItem('hf_token');
      if (!tk) { if (mounted) setUnread(0); return; }
      try {
        const res = await fetch(`${API}/notifications`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const j = await res.json();
        if (mounted && j.success) setUnread(j.data.unread ?? 0);
      } catch {}
    }

    poll();
    const t = setInterval(poll, 30_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return (
    <Link
      to="/notifications"
      className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      aria-label="Notifications"
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
