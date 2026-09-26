import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { CheckCircle2 } from 'lucide-react';

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderTracking() {
  const { id: idFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const initialId = idFromPath || searchParams.get('order') || '';
  const [orderId, setOrderId] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<{ status: string; created_at: string }[]>([]);
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

      const { data: historyData } = await supabase.rpc('get_order_status_history', { p_order_id: targetId });
      setHistory(historyData ?? []);
    } catch {
      setOrder(null);
      setHistory([]);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black dark:text-white tracking-tight">Order Tracking</h1>
        <p className="text-stone-500 text-sm">Enter your order ID to check real-time fulfillment status.</p>
      </div>

      <div className="flex gap-2 storefront-card p-2 sm:p-3">
        <input
          type="text"
          placeholder="Enter Order ID (UUID)..."
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="flex-1 px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-sm outline-none dark:text-white"
        />
        <button onClick={() => handleSearch()} disabled={loading} className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-2xl transition">
          {loading ? 'Searching...' : 'Track'}
        </button>
      </div>

      {notFound && (
        <p className="text-center text-sm font-bold text-red-500">Order not found. Please check your order ID.</p>
      )}

      {order && (
        <div className="storefront-card p-4 sm:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <p className="text-xs text-stone-500 font-bold uppercase">Order Reference</p>
              <h3 className="font-black text-xl dark:text-white">#{order.id}</h3>
            </div>
            <span className="px-3 py-1.5 bg-brand-500/10 text-brand-500 font-black text-xs uppercase rounded-xl">
              {order.status}
            </span>
          </div>

          {order.payment_status && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-stone-500">Payment:</span>
              <span className={`px-2.5 py-1 rounded-lg uppercase ${
                order.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                order.payment_status === 'failed' ? 'bg-red-500/10 text-red-500' :
                'bg-stone-200 dark:bg-stone-800 text-stone-500'
              }`}>
                {order.payment_status}
              </span>
            </div>
          )}

          {history.length > 0 && (
            <div className="flex items-start gap-1 pb-2 overflow-x-auto">
              {STATUS_STEPS.map((step, idx) => {
                const reached = history.some((h) => h.status === step);
                const isLast = idx === STATUS_STEPS.length - 1;
                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${reached ? 'bg-brand-500 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-400'}`}>
                        {reached ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${reached ? 'text-brand-500' : 'text-stone-400'}`}>{step}</span>
                    </div>
                    {!isLast && <div className={`flex-1 h-0.5 mx-1 ${reached ? 'bg-brand-500' : 'bg-stone-200 dark:bg-stone-800'}`} />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
            <div>
              <p className="text-stone-500 text-xs">Customer Name</p>
              <p className="font-bold dark:text-white">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs">Phone Number</p>
              <p className="font-bold dark:text-white">{order.customer_phone}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-stone-500 text-xs">Delivery Address</p>
              <p className="font-bold dark:text-white">{order.address}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
            <h4 className="font-bold text-sm dark:text-white mb-3">Ordered Items</h4>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="font-bold dark:text-white">{item.name} x{item.quantity}</span>
                  <span className="text-brand-500 font-bold">EGP {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-xl font-black dark:text-white">
            <span>Total Amount</span>
            <span className="text-brand-500">EGP {order.total}</span>
          </div>
        </div>
      )}
    </div>
  );
}