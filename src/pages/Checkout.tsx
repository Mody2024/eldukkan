import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendOrderConfirmationEmail } from '../lib/email';
import { useStore } from '../store';
import type { PaymentMethod } from '../types';
import { ShoppingBag, ArrowLeft, CheckCircle2, CreditCard, Tag, X, Loader2 } from 'lucide-react';

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
  const [prefilling, setPrefilling] = useState(false);
  const navigate = useNavigate();

  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const displayTotal = Math.max(0, subtotal - (appliedDiscount?.amount ?? 0));

  // Speed up repeat checkouts: a signed-in customer's details fill in from
  // their most recent order automatically instead of retyping name/phone/
  // address every single time. They can still edit anything before
  // submitting — this is a starting point, not a lock.
  useEffect(() => {
    if (!userId) return;
    setPrefilling(true);
    supabase
      .from('orders')
      .select('customer_name, customer_phone, address')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFormData((prev) => ({
            ...prev,
            name: data.customer_name || prev.name,
            phone: data.customer_phone || prev.phone,
            address: data.address || prev.address,
          }));
        }
        setPrefilling(false);
      });
  }, [userId]);

  const handleApplyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;
    setDiscountLoading(true);
    setDiscountMessage(null);
    try {
      const { data, error } = await supabase.rpc('validate_discount_code', { p_code: code, p_subtotal: subtotal }).single();
      if (error) throw error;
      const result = data as { valid: boolean; discount_amount: number; message: string };
      if (result.valid) {
        setAppliedDiscount({ code, amount: result.discount_amount });
        setDiscountMessage(result.message);
      } else {
        setAppliedDiscount(null);
        setDiscountMessage(result.message);
      }
    } catch {
      setDiscountMessage('Could not validate this code right now.');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput('');
    setDiscountMessage(null);
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);

    try {
      // Never trust the price sitting in localStorage/client state at
      // checkout time — re-fetch the current price for every item straight
      // from the products table and compute the charged total from that,
      // so a tampered client can't submit an arbitrary total_amount. Sale
      // pricing is honored here too — an active sale_price (not expired)
      // is the real charged price, not the original price.
      const ids = cart.map((item) => item.id);
      const { data: liveProducts, error: priceError } = await supabase
        .from('products')
        .select('id, price, sale_price, sale_ends_at, name')
        .in('id', ids);
      if (priceError) throw priceError;

      const priceMap = new Map((liveProducts ?? []).map((p) => {
        const onSale = p.sale_price && (!p.sale_ends_at || new Date(p.sale_ends_at) > new Date());
        return [p.id, onSale ? p.sale_price : p.price];
      }));
      const verifiedItems = cart.map((item) => ({
        ...item,
        price: priceMap.get(item.id) ?? item.price,
      }));
      const verifiedSubtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Discount is also re-validated server-side (via the same RPC) right
      // before charging — never trust the amount already sitting in state,
      // same principle as the price re-fetch above.
      let finalDiscountAmount = 0;
      let finalDiscountCode: string | null = null;
      if (appliedDiscount) {
        const { data: revalidated } = await supabase
          .rpc('validate_discount_code', { p_code: appliedDiscount.code, p_subtotal: verifiedSubtotal })
          .single();
        const result = revalidated as { valid: boolean; discount_amount: number } | null;
        if (result?.valid) {
          finalDiscountAmount = result.discount_amount;
          finalDiscountCode = appliedDiscount.code;
        }
      }
      const verifiedTotal = Math.max(0, verifiedSubtotal - finalDiscountAmount);

      const { data, error } = await supabase.from('orders').insert([
        {
          customer_name: formData.name,
          customer_email: userEmail ?? null,
          customer_phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
          payment_method: formData.paymentMethod,
          discount_code: finalDiscountCode,
          discount_amount: finalDiscountAmount,
          total: verifiedTotal,
          items: verifiedItems,
          status: 'pending',
          customer_id: userId ?? null,
        },
      ]).select().single();

      if (error) throw error;

      // Fire-and-forget confirmation email — never blocks or fails the
      // order itself if the email provider has a hiccup.
      // Fire-and-forget confirmation email via EmailJS (client-side, no
      // domain or backend function needed) — never blocks or fails the
      // order itself if email sending has a hiccup.
      if (userEmail) {
        sendOrderConfirmationEmail({
          to_email: userEmail,
          to_name: formData.name,
          order_id: data.id,
          order_total: verifiedTotal,
          order_items_summary: verifiedItems.map((i) => `${i.name} x${i.quantity}`).join(', '),
          tracking_url: `${window.location.origin}/tracking/${data.id}`,
        }).catch(() => {});
      }

      if (formData.paymentMethod === 'cod') {
        clearCart();
        navigate(`/tracking/${data.id}`);
        return;
      }

      // Real online payment: ask the create-payment Edge Function (server
      // side, holds the Paymob secret key) to open a payment session, then
      // send the browser to Paymob's hosted checkout — card, Vodafone Cash,
      // InstaPay, and Fawry all live on that one page. Order status only
      // flips to "paid" once the paymob-webhook function verifies the
      // transaction — never on the strength of this redirect alone.
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: { order_id: data.id },
      });

      if (paymentError || !paymentData?.checkout_url) {
        showToast('Could not start online payment. You can retry, or contact support with your order ID.');
        clearCart();
        navigate(`/tracking/${data.id}`);
        return;
      }

      clearCart();
      window.location.href = paymentData.checkout_url;
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
        <div className="w-20 h-20 bg-brand-500/10 text-brand-500 rounded-3xl flex items-center justify-center mx-auto">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-2xl font-black dark:text-white">Your cart is empty</h2>
        <p className="text-stone-500 text-sm">Add some items from the store before checking out.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition">
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/cart')} className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl hover:scale-105 transition dark:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">Checkout</h1>
          <p className="text-stone-500 text-sm">
            {prefilling ? 'Filling in your saved details...' : 'Complete your delivery and payment details.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSubmitOrder} className="md:col-span-2 space-y-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-3xl shadow-sm">
          <h2 className="text-xl font-black dark:text-white mb-4">Shipping Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Full Name</label>
              <input required type="text" placeholder="Full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Phone Number</label>
              <input required type="tel" placeholder="010XXXXXXXX" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Delivery Address</label>
              <textarea required placeholder="Street address, city, landmark" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500 min-h-[100px]" />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Discount Code (optional)</label>
              {appliedDiscount ? (
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <span className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    <Tag size={16} /> {appliedDiscount.code.toUpperCase()} applied — EGP {appliedDiscount.amount} off
                  </span>
                  <button type="button" onClick={handleRemoveDiscount} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="flex-1 p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={discountLoading || !discountInput.trim()}
                    className="px-5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {discountLoading ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}
              {discountMessage && !appliedDiscount && (
                <p className="text-xs text-red-500 mt-2">{discountMessage}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setFormData({ ...formData, paymentMethod: 'cod' })} className={`p-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${formData.paymentMethod === 'cod' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>
                  <CheckCircle2 size={18} /> Cash on Delivery
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, paymentMethod: 'instapay' })} className={`p-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition ${formData.paymentMethod === 'instapay' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-stone-200 dark:border-stone-700 text-stone-500'}`}>
                  <CreditCard size={18} /> Pay Online
                </button>
              </div>
              {formData.paymentMethod === 'instapay' && (
                <p className="text-xs text-stone-500 mt-2">Card, Vodafone Cash, InstaPay, or Fawry — choose on the next screen.</p>
              )}
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-black text-lg rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50">
            {loading
              ? 'Processing...'
              : formData.paymentMethod === 'cod'
                ? `Place Order (EGP ${displayTotal})`
                : `Continue to Payment (EGP ${displayTotal})`}
          </button>
        </form>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-3xl shadow-sm h-fit space-y-4">
          <h2 className="text-xl font-black dark:text-white">Order Summary</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm font-bold dark:text-stone-200">
                <span className="truncate max-w-[160px]">{item.name} x{item.quantity}</span>
                <span className="text-brand-500">EGP {item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-stone-500">
              <span>Subtotal</span>
              <span>EGP {subtotal}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between items-center text-sm font-bold text-emerald-500">
                <span>Discount</span>
                <span>-EGP {appliedDiscount.amount}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-black dark:text-white pt-2">
              <span>Total</span>
              <span className="text-brand-500">EGP {displayTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}