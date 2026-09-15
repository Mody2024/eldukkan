import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';

export default function OrderTracking() {
  const { id: idFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const initialId = idFromPath || searchParams.get('order') || '';
  const [orderId, setOrderId] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (initialId) handleSearch(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const handleSearch = async (idToSearch?: string) => {
    const targetId = (idToSearch ?? orderId).trim();
    if (!targetId) return;
    setLoading(true);
    setNotFound(false);

    try {
      // Orders are locked down by RLS so the public anon key can't list or
      // scan the table. This RPC is a SECURITY DEFINER function that looks
      // up exactly one order by its (effectively unguessable) UUID and
      // returns only customer-safe fields. See the SQL migration.
      const { data, error } = await supabase.rpc('get_order_by_id', { p_order_id: targetId }).single();
      if (error || !data) throw error ?? new Error('not found');
      setOrder(data as Order);
    } catch {
      setOrder(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black dark:text-white tracking-tight">Order Tracking</h1>
        <p className="text-zinc-500 text-sm">Enter your order ID to check real-time fulfillment status.</p>
      </div>

      <div className="flex gap-2 bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <input
          type="text"
          placeholder="Enter Order ID (UUID)..."
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-bold text-sm outline-none dark:text-white"
        />
        <button onClick={() => handleSearch()} disabled={loading} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl transition">
          {loading ? 'Searching...' : 'Track'}
        </button>
      </div>

      {notFound && (
        <p className="text-center text-sm font-bold text-red-500">Order not found. Please check your order ID.</p>
      )}

      {order && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase">Order Reference</p>
              <h3 className="font-black text-xl dark:text-white">#{order.id}</h3>
            </div>
            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 font-black text-xs uppercase rounded-xl">
              {order.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
            <div>
              <p className="text-zinc-500 text-xs">Customer Name</p>
              <p className="font-bold dark:text-white">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Phone Number</p>
              <p className="font-bold dark:text-white">{order.customer_phone}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-zinc-500 text-xs">Delivery Address</p>
              <p className="font-bold dark:text-white">{order.address}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="font-bold text-sm dark:text-white mb-3">Ordered Items</h4>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="font-bold dark:text-white">{item.name} x{item.quantity}</span>
                  <span className="text-amber-500 font-bold">EGP {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xl font-black dark:text-white">
            <span>Total Amount</span>
            <span className="text-amber-500">EGP {order.total}</span>
          </div>
        </div>
      )}
    </div>
  );
}