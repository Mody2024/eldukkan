import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store';
import Layout from './components/Layout';

// Placeholder imports for pages we will build next
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import AdminDashboard from './pages/AdminDashboard';
import OrderTracking from './pages/OrderTracking';
import Checkout from './pages/Checkout';

export function App() {
  const { theme, setUserEmail, setAdminStatus } = useStore();

  useEffect(() => {
    // Apply theme to the document root dynamically
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    // Global Auth Listener
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) checkAdminAccess(data.user.email);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setUserEmail(email);
      if (email) checkAdminAccess(email);
      else setAdminStatus(false);
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [theme]);

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
            <Route path="checkout" element={<Checkout />} />
            <Route path="tracking/:id" element={<OrderTracking />} />
          </Route>

          {/* Protected Admin Route */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;