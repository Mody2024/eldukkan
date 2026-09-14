import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { CreditCard, Smartphone, Banknote, ShieldCheck } from 'lucide-react';

export default function Checkout() {
  const { cart, clearCart } = useStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('vodafone_cash');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: ''
  });

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setLoading(true);

    // 1. Create order in database
    const { data: order, error } = await supabase.from('orders').insert([{
      customer_name: formData.fullName,
      customer_phone: formData.phone,
      customer_address: formData.address,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: 'pending' // pending, processing, shipped, delivered
    }]).select().single();

    if (error || !order) {
      alert("Error placing order. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Clear cart and redirect
    clearCart();
    setLoading(false);
    
    // In a real Paymob integration, you would redirect to the Paymob iframe here.
    // For now, we redirect to the live tracking page.
    navigate(`/tracking/${order.id}`);
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-in fade-in">
        <h2 className="text-2xl font-black mb-4 dark:text-white">Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="text-amber-500 font-bold hover:underline">
          Go back to the store
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Order Summary */}
      <div className="bg-zinc-100 dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 h-fit">
        <h2 className="text-2xl font-black mb-6 dark:text-white">Order Summary</h2>
        <div className="space-y-4 mb-6">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-sm">
              <span className="font-semibold dark:text-zinc-200">{item.name} x{item.quantity}</span>
              <span className="font-bold text-amber-500">EGP {item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6 flex justify-between items-center">
          <span className="text-xl font-bold dark:text-white">Total</span>
          <span className="text-3xl font-black text-amber-500">EGP {totalAmount}</span>
        </div>
      </div>

      {/* Checkout Form */}
      <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-2xl font-black mb-6 dark:text-white">Checkout Details</h2>
        <form onSubmit={handleCheckout} className="space-y-6">
          
          <div className="space-y-4">
            <input required type="text" placeholder="Full Name" className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-amber-500 transition-colors dark:text-white" onChange={e => setFormData({...formData, fullName: e.target.value})} />
            <input required type="tel" placeholder="Phone Number (e.g., 010...)" className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-amber-500 transition-colors dark:text-white" onChange={e => setFormData({...formData, phone: e.target.value})} />
            <textarea required placeholder="Delivery Address" className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-amber-500 transition-colors min-h-[100px] dark:text-white" onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>

          <div className="space-y-3">
            <label className="font-bold text-sm text-zinc-500 uppercase tracking-wider">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPaymentMethod('vodafone_cash')} className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'vodafone_cash' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
                <Smartphone size={24} /> <span className="text-xs font-bold">Vodafone Cash</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod('fawry')} className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${paymentMethod === 'fawry' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
                <Banknote size={24} /> <span className="text-xs font-bold">Fawry Pay</span>
              </button>
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50">
            {loading ? 'Processing...' : `Pay EGP ${totalAmount}`}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 font-medium">
            <ShieldCheck size={16} className="text-emerald-500" /> Secure encrypted checkout
          </div>
        </form>
      </div>
      
    </div>
  );
}