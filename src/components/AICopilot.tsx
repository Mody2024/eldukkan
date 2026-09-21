import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Sparkles, Send, Bot, User, X, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category: string | null;
  stock: number | null;
  rating: number | null;
}

interface ChatEntry {
  role: 'user' | 'model';
  content: string;
  products?: Product[];
}

// A stable per-browser identifier for guests (persisted in localStorage) —
// used only for the assistant's daily rate limit, nothing else. Signed-in
// customers use their real account id instead.
function getAnonId(): string {
  const key = 'eldukkan-anon-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatEntry[]>([
    { role: 'model', content: "Hi! Tell me what you're looking for — I can search the catalog and add things to your cart for you." },
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { userId, addToCart, showToast } = useStore();

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
      const history = messages.map((m) => ({ role: m.role, text: m.content }));
      const { data, error } = await supabase.functions.invoke('shop-assistant', {
        body: { message: userMessage, history, identifier: userId ?? getAnonId() },
      });

      if (error) throw error;

      // The agent may suggest adding a product to the cart — this is
      // executed here (client-side, where the cart actually lives), but
      // checkout itself always stays a separate, human-initiated step.
      if (data.action?.type === 'add_to_cart' && data.products) {
        const product = data.products.find((p: Product) => p.id === data.action.product_id);
        if (product) {
          for (let i = 0; i < (data.action.quantity || 1); i++) {
            addToCart({ ...product, image_url: '', price: product.sale_price ?? product.price });
          }
          showToast(`Added ${product.name} to your cart`);
        }
      }

      setMessages((prev) => [...prev, { role: 'model', content: data.reply, products: data.products }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', content: 'Sorry, I ran into an issue connecting just now — try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-black px-6 py-4 rounded-2xl shadow-2xl shadow-brand-500/30 hover:scale-105 transition-all"
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
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live catalog + cart help
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
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} />
                  </div>
                )}
                <div className="max-w-[85%] space-y-2">
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-500 text-white font-semibold rounded-br-none ml-auto w-fit' : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-none'}`}>
                    {msg.content}
                  </div>
                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-2">
                      {msg.products.slice(0, 3).map((p) => (
                        <Link key={p.id} to={`/product/${p.id}`} className="flex items-center justify-between bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 hover:border-brand-500/50 transition">
                          <div className="min-w-0">
                            <p className="font-bold text-xs dark:text-white truncate">{p.name}</p>
                            <p className="text-brand-500 font-black text-xs">EGP {p.sale_price ?? p.price}</p>
                          </div>
                          <ShoppingBag size={14} className="text-stone-400 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
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
              placeholder="e.g. buy me the best headphones"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 dark:text-white"
            />
            <button type="submit" disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white p-3 rounded-xl transition shadow-md disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}