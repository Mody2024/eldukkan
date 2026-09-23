import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store';
import Layout from './components/Layout';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

const Home = lazy(() => import('./pages/Home'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Category = lazy(() => import('./pages/Category'));
const Cart = lazy(() => import('./pages/Cart'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CustomerLogin = lazy(() => import('./pages/CustomerLogin'));
const Account = lazy(() => import('./pages/Account'));
const Wishlist = lazy(() => import('./pages/Wishlist'));

// The admin dashboard lives at a private, unguessable path instead of the
// old public "/admin". Set VITE_ADMIN_PATH in your environment (Vercel +
// local .env) to your own secret slug; this fallback only exists so a fresh
// clone still builds. Path secrecy is a deterrent, not the security
// boundary — real access control is Supabase Auth + RLS (see ProtectedAdminRoute).
const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH || 'ops-console-7f2k9x').replace(/^\/+/, '');

export function App() {
  const { setUserEmail, setUserId, setAdminStatus, setAdminRole, setAdminPermissions, setAdminCheckPending, setSiteSettings } = useStore();

  useEffect(() => {
    // Site-wide settings (announcement banner, maintenance mode) — public
    // read, no auth needed. Re-fetched live via Realtime so an admin's
    // change shows up for visitors without a page reload.
    const loadSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').eq('id', true).single();
      if (data) setSiteSettings({
        announcementBanner: data.announcement_banner,
        maintenanceMode: data.maintenance_mode,
        storeName: data.store_name || 'Eldukkan',
        logoUrl: data.logo_url,
        heroHeadline: data.hero_headline,
        heroSubheadline: data.hero_subheadline,
        heroImageUrl: data.hero_image_url,
        footerCreditsEnabled: data.footer_credits_enabled ?? true,
        footerCreditsText: data.footer_credits_text,
        sponsors: Array.isArray(data.sponsors) ? data.sponsors : [],
      });
    };
    loadSettings();
    const settingsChannel = supabase
      .channel('site-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, loadSettings)
      .subscribe();
    // Global Auth Listener
    // Register the listener before asking for the current session so OAuth
    // redirects (including INITIAL_SESSION / SIGNED_IN) are not missed.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setUserEmail(email);
      setUserId(session?.user?.id || null);

      if (email) {
        checkAdminAccess(email);
      } else {
        setAdminStatus(false);
        setAdminRole(null);
        setAdminPermissions([]);
        setAdminCheckPending(false);
      }
    });

    // Fallback/current-session sync. Supabase automatically restores a
    // persisted browser session and detects OAuth credentials in the URL.
    // This makes the app resilient if the initial auth event happened before
    // React mounted this component.
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      const email = session?.user?.email || null;
      setUserEmail(email);
      setUserId(session?.user?.id || null);

      if (email) {
        checkAdminAccess(email);
      } else {
        setAdminStatus(false);
        setAdminRole(null);
        setAdminPermissions([]);
        setAdminCheckPending(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const checkAdminAccess = async (email: string) => {
    setUserEmail(email);
    const { data } = await supabase.from('admin_users').select('email, role, permissions').eq('email', email.trim().toLowerCase());
    const match = data && data.length > 0 ? data[0] : null;
    setAdminStatus(!!match);
    setAdminRole(match?.role === 'owner' ? 'owner' : match?.role === 'staff' ? 'staff' : match ? 'admin' : null);
    setAdminPermissions(Array.isArray(match?.permissions) ? match.permissions : []);
    setAdminCheckPending(false);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-stone-500 font-bold">Loading ElDukkan…</div>}>
          <Routes>
          {/* Public Storefront Routes wrapped in Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="category/:slug" element={<Category />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="tracking" element={<OrderTracking />} />
            <Route path="tracking/:id" element={<OrderTracking />} />
            <Route path="login" element={<CustomerLogin />} />
            <Route path="account" element={<Account />} />
            <Route path="wishlist" element={<Wishlist />} />
          </Route>

          {/* Admin dashboard: private path, gated by auth + admin_users + RLS */}
          <Route path={`/${ADMIN_PATH}`} element={<ProtectedAdminRoute />} />

          {/* Catch-all redirect — including the old /admin path, which now
             404s into the storefront like any other unknown URL. */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
}

export default App;