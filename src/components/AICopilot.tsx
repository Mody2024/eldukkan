import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Sparkles, Send, Bot, User, X } from 'lucide-react';

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help with product info here on the storefront. Sign in as an admin to ask about orders or sales.' }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isAuthorizedAdmin = useStore((s) => s.isAuthorizedAdmin);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const lowerQuery = userMessage.toLowerCase();
      let aiResponse: string;

      const asksAboutOrders = lowerQuery.includes('status') || lowerQuery.includes('orders') || lowerQuery.includes('sales');

      if (asksAboutOrders) {
        // Order/revenue data is customer PII and business data — this
        // widget renders on every public page, so it must never fetch the
        // orders table for a non-admin session. RLS also blocks this read
        // for the anon key regardless, but we don't even attempt it here.
        if (!isAuthorizedAdmin) {
          aiResponse = "I can't share order or sales data here — that's restricted to signed-in admins.";
        } else {
          const { data: orders } = await supabase.from('orders').select('total_amount');
          const totalSales = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
          aiResponse = `You currently have ${orders?.length || 0} total orders recorded, with a cumulative revenue of EGP ${totalSales}.`;
        }
      } else if (lowerQuery.includes('product') || lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
        const { data: products } = await supabase.from('products').select('name, price');
        const productList = products?.map((p) => `${p.name} (EGP ${p.price})`).join(', ') || 'No products found';
        aiResponse = `Here is the current storefront catalog: ${productList}.`;
      } else {
        aiResponse = `I can help you look up products in the catalog. What are you looking for?`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the store database.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-black px-6 py-4 rounded-2xl shadow-2xl shadow-brand-500/30 hover:scale-105 transition-all group"
        >
          <Sparkles size={22} />
          <span>Ask Eldukkan</span>
        </button>
      ) : (
        <div className="w-[380px] sm:w-[420px] h-[550px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-stone-50 dark:bg-stone-950 p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center font-bold">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-black dark:text-white text-sm">Eldukkan Assistant</h3>
                <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live catalog lookup
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-2 rounded-xl transition">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} />
                  </div>
                )}
                <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-500 text-white font-semibold rounded-br-none' : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-none'}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0 mt-1">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 items-center text-stone-400 text-xs font-semibold animate-pulse">
                <Bot size={16} /> Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex gap-2">
            <input
              type="text"
              placeholder="Ask about a product..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 dark:text-white"
            />
            <button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white p-3 rounded-xl transition shadow-md">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}