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

  useEffect(() => {
    if (!userId) return;
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
          <p className="text-zinc-500 text-sm">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 font-bold text-sm transition"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-black dark:text-white">Order History</h2>

        {loading ? (
          <p className="text-zinc-500 text-sm py-8 text-center font-bold">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <Package className="mx-auto text-zinc-400" size={32} />
            <p className="text-zinc-500 text-sm">No orders yet.</p>
            <Link to="/" className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-sm rounded-xl transition">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/tracking/${order.id}`}
                className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl hover:border-amber-500/50 transition"
              >
                <div>
                  <p className="font-black dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase font-bold px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg">{order.status}</span>
                  <span className="font-black text-amber-500">EGP {order.total}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}