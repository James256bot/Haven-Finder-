import { Link, NavLink, Outlet } from 'react-router-dom';

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">H</div>
            <span className="font-semibold text-lg tracking-tight text-slate-900">HavenFinder</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <NavLink to="/search" className="text-slate-600 hover:text-slate-900">Browse</NavLink>
            <NavLink to="/list" className="text-slate-600 hover:text-slate-900">List a property</NavLink>
            <NavLink to="/my-listings" className="text-slate-600 hover:text-slate-900">My listings</NavLink>
            <NavLink to="/messages" className="text-slate-600 hover:text-slate-900">Messages</NavLink>
            <NavLink to="/marketing" className="text-slate-600 hover:text-slate-900">Marketing</NavLink>
            <NavLink to="/dashboard" className="text-slate-600 hover:text-slate-900">Dashboard</NavLink>
            <NavLink to="/incoming" className="text-slate-600 hover:text-slate-900">Incoming</NavLink>
            <NavLink to="/favorites" className="text-slate-600 hover:text-slate-900">Saved</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">Sign in</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-sm text-slate-500 flex flex-col sm:flex-row justify-between gap-3">
          <p>© {new Date().getFullYear()} HavenFinder. Find your haven.</p>
          <p>
            Some listings powered by{' '}
            <a href="https://untera.io" className="underline hover:text-slate-700" target="_blank" rel="noreferrer">
              Untera
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
