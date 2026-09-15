import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store';
import Layout from './components/Layout';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import OrderTracking from './pages/OrderTracking';
import Checkout from './pages/Checkout';
import CustomerLogin from './pages/CustomerLogin';
import Account from './pages/Account';

// The admin dashboard lives at a private, unguessable path instead of the
// old public "/admin". Set VITE_ADMIN_PATH in your environment (Vercel +
// local .env) to your own secret slug; this fallback only exists so a fresh
// clone still builds. Path secrecy is a deterrent, not the security
// boundary — real access control is Supabase Auth + RLS (see ProtectedAdminRoute).
const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH || 'ops-console-7f2k9x').replace(/^\/+/, '');

export function App() {
  const { setUserEmail, setUserId, setAdminStatus } = useStore();

  useEffect(() => {
    // Global Auth Listener
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        if (data.user.email) checkAdminAccess(data.user.email);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setUserEmail(email);
      setUserId(session?.user?.id || null);
      if (email) checkAdminAccess(email);
      else setAdminStatus(false);
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const checkAdminAccess = async (email: string) => {
    setUserEmail(email);
    const { data } = await supabase.from('admin_users').select('email').eq('email', email.trim().toLowerCase());
    setAdminStatus(!!(data && data.length > 0));
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <BrowserRouter>
        <Routes>
          {/* Public Storefront Routes wrapped in Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="tracking" element={<OrderTracking />} />
            <Route path="tracking/:id" element={<OrderTracking />} />
            <Route path="login" element={<CustomerLogin />} />
            <Route path="account" element={<Account />} />
          </Route>

          {/* Admin dashboard: private path, gated by auth + admin_users + RLS */}
          <Route path={`/${ADMIN_PATH}`} element={<ProtectedAdminRoute />} />

          {/* Catch-all redirect — including the old /admin path, which now
             404s into the storefront like any other unknown URL. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;