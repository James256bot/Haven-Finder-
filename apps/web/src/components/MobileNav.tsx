import { NavLink } from 'react-router-dom';

export function MobileNav() {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
      isActive ? 'text-brand-600' : 'text-slate-500'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-14">
        <NavLink to="/" className={itemClass} end>
          {({ isActive }) => (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10 L12 3 L21 10 L21 20 L15 20 L15 14 L9 14 L9 20 L3 20 Z" />
              </svg>
              <span>Home</span>
            </>
          )}
        </NavLink>

        <NavLink to="/search" className={itemClass}>
          {({ isActive }) => (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21 L16.5 16.5" />
              </svg>
              <span>Search</span>
            </>
          )}
        </NavLink>

        <NavLink to="/favorites" className={itemClass}>
          {({ isActive }) => (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              <span>Saved</span>
            </>
          )}
        </NavLink>

        <NavLink to="/messages" className={itemClass}>
          {({ isActive }) => (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12 A8 8 0 1 1 12 4 L21 4 L21 12 Z" />
              </svg>
              <span>Messages</span>
            </>
          )}
        </NavLink>

        <NavLink to="/dashboard" className={itemClass}>
          {({ isActive }) => (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="8" r="3.5" />
                <path d="M3 20 C3 16 6 14 10 14 C14 14 17 16 17 20" />
              </svg>
              <span>Profile</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
