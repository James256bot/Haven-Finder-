import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';

const SearchPage       = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const MapPage          = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const PropertyPage     = lazy(() => import('./pages/PropertyPage').then(m => ({ default: m.PropertyPage })));
const LoginPage        = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage     = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage    = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MyListingsPage   = lazy(() => import('./pages/MyListingsPage').then(m => ({ default: m.MyListingsPage })));
const MessagesPage     = lazy(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const ConversationPage = lazy(() => import('./pages/ConversationPage').then(m => ({ default: m.ConversationPage })));
const FavoritesPage    = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const ListPropertyPage = lazy(() => import('./pages/ListPropertyPage').then(m => ({ default: m.ListPropertyPage })));
const MarketingPage    = lazy(() => import('./pages/MarketingPage').then(m => ({ default: m.MarketingPage })));
const AdminPage        = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const TermsPage        = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage      = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

function PageFallback() {
  return (
    <div className="container-page py-16 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-brand-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-ink-500">Loading…</p>
      </div>
    </div>
  );
}

const wrap = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search"          element={wrap(<SearchPage />)} />
        <Route path="/map"             element={wrap(<MapPage />)} />
        <Route path="/property/:slug"  element={wrap(<PropertyPage />)} />
        <Route path="/login"           element={wrap(<LoginPage />)} />
        <Route path="/register"        element={wrap(<RegisterPage />)} />
        <Route path="/dashboard"       element={wrap(<DashboardPage />)} />
        <Route path="/my-listings"     element={wrap(<MyListingsPage />)} />
        <Route path="/messages"        element={wrap(<MessagesPage />)} />
        <Route path="/messages/:id"    element={wrap(<ConversationPage />)} />
        <Route path="/favorites"       element={wrap(<FavoritesPage />)} />
        <Route path="/list"            element={wrap(<ListPropertyPage />)} />
        <Route path="/marketing"       element={wrap(<MarketingPage />)} />
        <Route path="/admin"           element={wrap(<AdminPage />)} />
        <Route path="/terms"           element={wrap(<TermsPage />)} />
        <Route path="/privacy"         element={wrap(<PrivacyPage />)} />
      </Route>
    </Routes>
  );
}
