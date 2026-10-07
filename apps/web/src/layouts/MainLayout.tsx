import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { MobileNav } from '../components/MobileNav';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useEffect, useState } from 'react';

export function MainLayout() {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = loc.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-base font-semibold transition-colors relative ${isActive ? 'text-brand-600' : 'text-ink-600 hover:text-ink-900'}`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className={`sticky top-0 z-40 transition-all ${
        scrolled ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/80'
        : isHome ? 'bg-transparent' : 'bg-white border-b border-slate-200/80'
      }`}>
        <div className="container-page">
          <div className="h-28 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center flex-shrink-0 group">
              <img
                src="/logo-primary.png"
                alt="HavenFinder"
                className="h-20 w-auto transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              <NavLink to="/search" className={navClass}>Browse</NavLink>
              <NavLink to="/map" className={navClass}>Map</NavLink>
              <NavLink to="/my-listings" className={navClass}>My listings</NavLink>
              <NavLink to="/messages" className={navClass}>Messages</NavLink>
              <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Sign in</Link>
              <Link to="/list" className="btn btn-primary btn-md hidden sm:inline-flex">List a property</Link>
              <button onClick={() => setMenuOpen(o => !o)} className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100" aria-label="Menu">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {menuOpen ? <path d="M6 6 L18 18 M6 18 L18 6" /> : <path d="M4 7 H20 M4 12 H20 M4 17 H20" />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="container-page py-4 flex flex-col gap-1">
              <NavLink to="/search" className={navClass + ' py-3'}>Browse properties</NavLink>
              <NavLink to="/my-listings" className={navClass + ' py-3'}>My listings</NavLink>
              <NavLink to="/messages" className={navClass + ' py-3'}>Messages</NavLink>
              <NavLink to="/dashboard" className={navClass + ' py-3'}>Dashboard</NavLink>
              <NavLink to="/favorites" className={navClass + ' py-3'}>Saved</NavLink>
              <NavLink to="/marketing" className={navClass + ' py-3'}>Marketing</NavLink>
              <div className="border-t border-slate-100 my-2" />
              <Link to="/login" className="py-3 text-sm font-medium text-slate-600">Sign in</Link>
              <Link to="/list" className="btn btn-primary btn-md mt-2">List a property</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pb-14 md:pb-0">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="bg-ink-900 text-ink-300 mt-24">
        <div className="container-page py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <img
                src="/logo-primary.png"
                alt="HavenFinder"
                className="h-20 w-auto transition-transform duration-200 group-hover:scale-[1.03]"
              />
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                Discover trusted homes, stays, spaces, and properties across Uganda and beyond.
              </p>
            </div>

            <div>
              <h4 className="text-white text-base font-display font-bold mb-4">Explore</h4>
              <ul className="space-y-2.5 text-base">
                <li><Link to="/search?country=UG" className="hover:text-white transition-colors">Uganda</Link></li>
                <li><Link to="/search?country=KE" className="hover:text-white transition-colors">Kenya</Link></li>
                <li><Link to="/search?listingType=rent" className="hover:text-white transition-colors">For rent</Link></li>
                <li><Link to="/search?listingType=sale" className="hover:text-white transition-colors">For sale</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-base font-display font-bold mb-4">Company</h4>
              <ul className="space-y-2.5 text-base">
                <li><Link to="/list" className="hover:text-white transition-colors">List a property</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><a href="https://untera.io" className="hover:text-white transition-colors" target="_blank" rel="noreferrer">Powered by Untera</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} HavenFinder. All rights reserved.</p>
            <p>Made in Kampala 🇺🇬</p>
          </div>
        </div>
      </footer>
      <MobileNav />
    </div>
  );
}
