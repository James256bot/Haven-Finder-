import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { PropertyPage } from './pages/PropertyPage';
import { SearchPage } from './pages/SearchPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyListingsPage } from './pages/MyListingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { ConversationPage } from './pages/ConversationPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { SavedSearchesPage } from './pages/SavedSearchesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ListPropertyPage } from './pages/ListPropertyPage';
import { MarketingPage } from './pages/MarketingPage';
import { AdminPage } from './pages/AdminPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { WantedPage } from './pages/WantedPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search"          element={<SearchPage />} />
        <Route path="/listing/:slug"   element={<PropertyPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/my-listings"     element={<MyListingsPage />} />
        <Route path="/messages"        element={<MessagesPage />} />
        <Route path="/messages/:id"    element={<ConversationPage />} />
        <Route path="/favorites"       element={<FavoritesPage />} />
        <Route path="/saved-searches"  element={<SavedSearchesPage />} />
        <Route path="/notifications"   element={<NotificationsPage />} />
        <Route path="/list"            element={<ListPropertyPage />} />
        <Route path="/marketing"       element={<MarketingPage />} />
        <Route path="/admin"           element={<AdminPage />} />
        <Route path="/wanted"          element={<WantedPage />} />
        <Route path="/terms"           element={<TermsPage />} />
        <Route path="/privacy"         element={<PrivacyPage />} />
      </Route>
    </Routes>
  );
}
