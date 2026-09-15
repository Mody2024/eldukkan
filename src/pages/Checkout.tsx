import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { PaymentMethod } from '../types';
import { ShoppingBag, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Checkout() {
  const { cart, clearCart, showToast, userEmail, userId } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    paymentMethod: 'cod' as PaymentMethod,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const displayTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);

    try {
      // Never trust the price sitting in localStorage/client state at
      // checkout time — re-fetch the current price for every item straight
      // from the products table and compute the charged total from that,
      // so a tampered client can't submit an arbitrary total_amount.
      const ids = cart.map((item) => item.id);
      const { data: liveProducts, error: priceError } = await supabase
        .from('products')
        .select('id, price, name')
        .in('id', ids);
      if (priceError) throw priceError;

      const priceMap = new Map((liveProducts ?? []).map((p) => [p.id, p.price]));
      const verifiedItems = cart.map((item) => ({
        ...item,
        price: priceMap.get(item.id) ?? item.price,
      }));
      const verifiedTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const { data, error } = await supabase.from('orders').insert([
        {
          customer_name: formData.name,
          customer_email: userEmail ?? null,
          customer_phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
          payment_method: formData.paymentMethod,
          total: verifiedTotal,
          items: verifiedItems,
          status: 'pending',
          customer_id: userId ?? null,
        },
      ]).select().single();

      if (error) throw error;

      clearCart();
      navigate(`/tracking/${data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Error placing order: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-2xl font-black dark:text-white">Your cart is empty</h2>
        <p className="text-zinc-500 text-sm">Add some items from the store before checking out.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition">
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/cart')} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:scale-105 transition dark:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">Checkout</h1>
          <p className="text-zinc-500 text-sm">Complete your delivery and payment details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSubmitOrder} className="md:col-span-2 space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm">
          <h2 className="text-xl font-black dark:text-white mb-4">Shipping Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Full Name</label>
              <input required type="text" placeholder="Almuddaththir Mahmoud" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none focus:border-amber-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Phone Number</label>
              <input required type="tel" placeholder="010XXXXXXXX" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none focus:border-amber-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Delivery Address</label>
              <textarea required placeholder="Street address, city, landmark" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none focus:border-amber-500 min-h-[100px]" />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setFormData({ ...formData, paymentMethod: 'cod' })} className={`p-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${formData.paymentMethod === 'cod' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}>
                  <CheckCircle2 size={18} /> Cash on Delivery
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, paymentMethod: 'instapay' })} className={`p-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${formData.paymentMethod === 'instapay' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}>
                  <CheckCircle2 size={18} /> InstaPay / Wallet
                </button>
              </div>
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50">
            {loading ? 'Processing Order...' : `Place Order (EGP ${displayTotal})`}
          </button>
        </form>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm h-fit space-y-4">
          <h2 className="text-xl font-black dark:text-white">Order Summary</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm font-bold dark:text-zinc-200">
                <span className="truncate max-w-[160px]">{item.name} x{item.quantity}</span>
                <span className="text-amber-500">EGP {item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-lg font-black dark:text-white">
            <span>Total</span>
            <span className="text-amber-500">EGP {displayTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}