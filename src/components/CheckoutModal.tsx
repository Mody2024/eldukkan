import React, { useState } from 'react';
import { Truck, Wallet, Receipt, CreditCard, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CartItem } from '../types';

interface Props {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onClearCart: () => void;
}

export const CheckoutModal: React.FC<Props> = ({ cart, total, onClose, onClearCart }) => {
  const [method, setMethod] = useState<'cod' | 'vodafone' | 'fawry' | 'card'>('cod');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Cairo');
  const [txId, setTxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fawryCode] = useState(() => Math.floor(1000000000 + Math.random() * 9000000000).toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('orders').insert([
        {
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          address,
          city,
          payment_method: method,
          payment_reference: method === 'vodafone' ? txId : method === 'fawry' ? fawryCode : 'N/A',
          total,
          items: cart,
          status: 'Pending',
        },
      ]);

      if (error) throw error;

      alert(`Order submitted successfully via ${method.toUpperCase()}!`);
      onClearCart();
      onClose();
    } catch (err: any) {
      alert(`Error submitting order: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full text-white max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-amber-500">Checkout (${total.toFixed(2)})</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Full Name" required value={name} onChange={(e) => setName(e.target.value)} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
            <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input type="tel" placeholder="Phone (e.g., 01012345678)" required value={phone} onChange={(e) => setPhone(e.target.value)} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
            <select value={city} onChange={(e) => setCity(e.target.value)} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
              <option value="Cairo">Cairo</option>
              <option value="Alexandria">Alexandria</option>
              <option value="Giza">Giza</option>
              <option value="International">Outside Egypt</option>
            </select>
          </div>

          <textarea placeholder="Delivery Address" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm h-20" />

          <label className="block text-xs text-zinc-400 font-semibold uppercase">Payment Gateway</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMethod('cod')} className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1 ${method === 'cod' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800'}`}>
              <Truck size={18} /> Cash on Delivery
            </button>
            <button type="button" onClick={() => setMethod('vodafone')} className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1 ${method === 'vodafone' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800'}`}>
              <Wallet size={18} /> Vodafone Cash
            </button>
            <button type="button" onClick={() => setMethod('fawry')} className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1 ${method === 'fawry' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800'}`}>
              <Receipt size={18} /> Fawry Pay
            </button>
            <button type="button" onClick={() => setMethod('card')} className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1 ${method === 'card' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-zinc-800'}`}>
              <CreditCard size={18} /> Card / PayPal
            </button>
          </div>

          {method === 'vodafone' && (
            <div className="bg-zinc-800/80 p-3 rounded-xl text-xs space-y-2 border border-zinc-700">
              <p className="text-amber-400 font-bold">Transfer total to Wallet: 01099887766</p>
              <input type="text" placeholder="Enter Transaction Reference ID" required value={txId} onChange={(e) => setTxId(e.target.value)} className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded-lg" />
            </div>
          )}

          {method === 'fawry' && (
            <div className="bg-zinc-800/80 p-3 rounded-xl text-xs text-center border border-zinc-700 space-y-1">
              <p className="text-zinc-400">Pay at any Fawry retail outlet using code:</p>
              <p className="text-xl font-mono font-bold text-amber-400">{fawryCode}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-600 transition">
            {loading ? 'Processing...' : 'Confirm & Complete Order'}
          </button>
        </form>
      </div>
    </div>
  );
};