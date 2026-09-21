import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Order } from '../types';
import { LogOut, Package } from 'lucide-react';

export default function Account() {
  const { userId, userEmail, setUserId, setUserEmail, setAdminStatus } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(!userId);

  useEffect(() => {
    let cancelled = false;

    // OAuth redirects can render /account before App.tsx has finished
    // synchronizing the Supabase session into the Zustand store. Do not
    // redirect to /login during that short initialization window.
    const loadSession = async () => {
      if (userId) {
        if (!cancelled) setAuthChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session?.user) {
        setUserId(data.session.user.id);
        setUserEmail(data.session.user.email ?? null);
        setAuthChecking(false);
      } else {
        setAuthChecking(false);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;

      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        setAuthChecking(false);
      } else {
        setUserId(null);
        setUserEmail(null);
        setAuthChecking(false);
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [userId, setUserId, setUserEmail]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (authChecking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-stone-500 text-sm font-bold">Signing you in...</p>
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
    setAdminStatus(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">My Account</h1>
          <p className="text-stone-500 text-sm">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-red-500 font-bold text-sm transition"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-black dark:text-white">Order History</h2>

        {loading ? (
          <p className="text-stone-500 text-sm py-8 text-center font-bold">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl">
            <Package className="mx-auto text-stone-400" size={32} />
            <p className="text-stone-500 text-sm">No orders yet.</p>
            <Link to="/" className="inline-block px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-sm rounded-xl transition">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/tracking/${order.id}`}
                className="flex items-center justify-between bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl hover:border-brand-500/50 transition"
              >
                <div>
                  <p className="font-black dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-stone-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase font-bold px-2.5 py-1 bg-brand-500/10 text-brand-500 rounded-lg">{order.status}</span>
                  <span className="font-black text-brand-500">EGP {order.total}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}