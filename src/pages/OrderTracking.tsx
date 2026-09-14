import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    // 1. Fetch initial status
    const fetchOrder = async () => {
      const { data } = await supabase.from('orders').select('*').eq('id', id).single();
      if (data) setOrder(data);
    };
    fetchOrder();

    // 2. Subscribe to real-time database changes for live tracking
    const subscription = supabase.channel('order_tracking')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, 
      (payload) => {
        setOrder(payload.new);
      }).subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [id]);

  if (!order) return <div className="text-center mt-20 animate-pulse font-bold dark:text-white">Locating order...</div>;

  const steps = [
    { id: 'pending', label: 'Order Placed', icon: Clock },
    { id: 'processing', label: 'Processing', icon: Package },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  return (
    <div className="max-w-3xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm text-center">
        
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl mb-6">
          <Truck size={32} />
        </div>
        
        <h1 className="text-3xl font-black mb-2 dark:text-white tracking-tight">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
        <p className="text-zinc-500 mb-12 font-medium">Thank you, {order.customer_name}. We are preparing your items.</p>

        {/* Live Progress Pipeline */}
        <div className="relative flex justify-between items-center mb-12">
          {/* Progress Bar Background */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full z-0"></div>
          {/* Active Progress Bar */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-amber-500 rounded-full z-0 transition-all duration-1000 ease-in-out"
            style={{ width: `${(Math.max(currentStepIndex, 0) / (steps.length - 1)) * 100}%` }}
          ></div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-500 ${isCompleted ? 'bg-amber-500 border-white dark:border-zinc-900 text-black shadow-lg shadow-amber-500/30' : 'bg-zinc-100 dark:bg-zinc-800 border-white dark:border-zinc-900 text-zinc-400'}`}>
                  <Icon size={20} className={isCurrent ? 'animate-bounce' : ''} />
                </div>
                <span className={`text-sm font-bold ${isCompleted ? 'text-black dark:text-white' : 'text-zinc-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        
        <Link to="/" className="inline-block bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold py-3 px-8 rounded-xl transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}