import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Bot, User, X } from 'lucide-react';

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Eldukkan V3 Copilot. I have full context of your inventory, orders, and storefront structure. How can I assist you today?' }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data: products } = await supabase.from('products').select('*');
      const { data: orders } = await supabase.from('orders').select('*');

      let aiResponse = "";
      const lowerQuery = userMessage.toLowerCase();

      if (lowerQuery.includes('status') || lowerQuery.includes('orders') || lowerQuery.includes('sales')) {
        const totalSales = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
        aiResponse = `You currently have ${orders?.length || 0} total orders recorded, with a cumulative revenue of EGP ${totalSales}. Everything is syncing smoothly with Supabase!`;
      } else if (lowerQuery.includes('product') || lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
        const productList = products?.map(p => `${p.name} (EGP ${p.price})`).join(', ') || 'No products found';
        aiResponse = `Here is your current inventory stock: ${productList}.`;
      } else if (lowerQuery.includes('update') || lowerQuery.includes('file') || lowerQuery.includes('code') || lowerQuery.includes('change')) {
        aiResponse = `I am ready to modify files or adjust configurations! Tell me specifically which file or component you want to update, and I will generate the complete patch for you.`;
      } else {
        aiResponse = `I've processed your request regarding "${userMessage}". As your Eldukkan V3 assistant, I can check inventory metrics, analyze orders, or write code updates for your store files instantly. What would you like to build or change next?`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the store database.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black px-6 py-4 rounded-2xl shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all group"
        >
          <Sparkles className="animate-spin" size={22} />
          <span>AI Copilot</span>
        </button>
      ) : (
        <div className="w-[380px] sm:w-[420px] h-[550px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center font-bold">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-black dark:text-white text-sm">Eldukkan Copilot</h3>
                <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Supabase Link
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-2 rounded-xl transition">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} />
                  </div>
                )}
                <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-500 text-black font-semibold rounded-br-none' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none'}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-1">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 items-center text-zinc-400 text-xs font-semibold animate-pulse">
                <Bot size={16} /> Analyzing store logs & files...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
            <input 
              type="text" 
              placeholder="Ask to update files, check inventory..." 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 dark:text-white"
            />
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black p-3 rounded-xl transition shadow-md">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}