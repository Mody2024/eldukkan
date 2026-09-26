import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Bot, Check, Coins, RotateCcw, Send, ShoppingBag, Sparkles, User, X, Zap } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category: string | null;
  stock: number | null;
  rating: number | null;
  category: string | null;
  image_url: string | null;
}

interface ChatEntry {
  role: 'user' | 'model';
  content: string;
  products?: Product[];
  cartAction?: {
    productId: string;
    quantity: number;
    previousQuantity: number;
  };
}

interface AiStatus {
  enabled?: boolean;
  unlimited: boolean;
  balance: number;
  nextRenewalAt: string;
  renewalCredits: number;
  messageCost: number;
  actionCost: number;
  memoryEnabled: boolean;
  requireConfirmation: boolean;
}

interface PendingAction {
  type: 'add_to_cart';
  product_id: string;
  product_name?: string;
  quantity: number;
  requestId: string;
  creditCost: number;
  requiresConfirmation: boolean;
}

const WELCOME: ChatEntry = {
  role: 'model',
  content: "Hi! Tell me what you're looking for. I can search the live catalog and help add a product to your cart.",
};

function getAnonId(): string {
  const key = 'eldukkan-anon-id';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function formatRemaining(nextRenewalAt: string | undefined, now: number) {
  if (!nextRenewalAt) return '--:--:--';
  const diff = Math.max(0, new Date(nextRenewalAt).getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

function storageKey(userId: string | null) {
  return 'eldukkan-ai-chat:' + (userId || getAnonId());
}

export default function AICopilot() {
  const { userId, theme, language, cart, addToCart, updateQuantity, removeFromCart, showToast } = useStore();
  const key = useMemo(() => storageKey(userId), [userId]);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatEntry[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let next: ChatEntry[] = [WELCOME];
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatEntry[];
        if (Array.isArray(parsed) && parsed.length) next = parsed.slice(-20);
      }
    } catch {
      // Session memory is optional.
    }
    setMessages(next);
    setPendingAction(null);
    setHydratedKey(key);
  }, [key]);

  useEffect(() => {
    if (hydratedKey !== key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(messages.slice(-20)));
    } catch {
      // Session storage is optional.
    }
  }, [messages, key, hydratedKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingAction]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshStatus = async () => {
    setStatusLoading(true);
    const { data, error } = await supabase.functions.invoke('shop-assistant', {
      body: {
        mode: 'status',
        identifier: userId ?? getAnonId(),
      },
    });
    if (!error && data) setStatus(data as AiStatus);
    setStatusLoading(false);
  };

  useEffect(() => {
    void refreshStatus();
  }, [userId]);

  useEffect(() => {
    if (!status?.nextRenewalAt || status.unlimited) return;
    if (new Date(status.nextRenewalAt).getTime() > now) return;
    void refreshStatus();
  }, [now, status?.nextRenewalAt, status?.unlimited]);

  const addProductToCart = (product: Product, quantity: number) => {
    const previousQuantity = cart.find((item) => item.id === product.id)?.quantity ?? 0;
    for (let i = 0; i < quantity; i += 1) {
      addToCart({ ...product, category: product.category ?? undefined, image_url: product.image_url || '', price: product.sale_price ?? product.price });
    }
    return previousQuantity;
  };

  const rememberEvent = (product: Product) => {
    void supabase.functions.invoke('shop-assistant', {
      body: {
        mode: 'remember_event',
        identifier: userId ?? getAnonId(),
        event: { type: 'add_to_cart', productId: product.id, productName: product.name },
      },
    });
  };

  const appendAddedMessage = (product: Product, quantity: number, previousQuantity: number) => {
    setMessages((prev) => [...prev, {
      role: 'model',
      content: 'Added ' + product.name + ' to your cart.',
      cartAction: { productId: product.id, quantity, previousQuantity },
    }]);
  };

  const confirmAction = async () => {
    if (!pendingAction || loading) return;
    setLoading(true);
    const action = pendingAction;
    setPendingAction(null);
    try {
      const { data, error } = await supabase.functions.invoke('shop-assistant', {
        body: {
          mode: 'confirm_action',
          identifier: userId ?? getAnonId(),
          requestId: action.requestId,
          action,
        },
      });
      if (error) throw error;
      if (!data.allowed) {
        setMessages((prev) => [...prev, { role: 'model', content: data.error || 'I could not complete that cart action.' }]);
        if (data.balance != null) setStatus((prev) => prev ? { ...prev, balance: Number(data.balance) } : prev);
        return;
      }

      const product = data.product as Product;
      const previousQuantity = addProductToCart(product, Number(data.quantity || action.quantity));
      setStatus((prev) => prev && data.credits ? { ...prev, ...data.credits } : prev);
      appendAddedMessage(product, Number(data.quantity || action.quantity), previousQuantity);
      rememberEvent(product);
      showToast('Added ' + product.name + ' to your cart');
    } catch (err) {
      console.error('Eldukkan Assistant action error:', err);
      setMessages((prev) => [...prev, { role: 'model', content: 'Sorry, that cart action could not be completed.' }]);
    } finally {
      setLoading(false);
    }
  };

  const undoCartAction = (action: NonNullable<ChatEntry['cartAction']>) => {
    if (action.previousQuantity === 0) removeFromCart(action.productId);
    else updateQuantity(action.productId, action.previousQuantity);
    setMessages((prev) => [...prev, { role: 'model', content: 'Undone — the cart is back to its previous quantity.' }]);
    showToast('Cart action undone');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || statusLoading) return;

    if (status?.enabled === false) {
      setMessages((prev) => [...prev, { role: 'model', content: 'The AI assistant is currently unavailable.' }]);
      return;
    }

    if (status && !status.unlimited && status.balance < Math.max(0, status.messageCost)) {
      setMessages((prev) => [...prev, {
        role: 'model',
        content: 'You are out of AI credits right now. Your next renewal is shown above.',
      }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const requestId = crypto.randomUUID();
    try {
      const history = messages.filter((m) => m.role === 'user' || m.role === 'model').slice(-8).map((m) => ({ role: m.role, text: m.content }));
      const context = {
        page: window.location.pathname,
        language,
        theme,
        cart: cart.slice(0, 6).map((item) => ({ id: item.id, name: item.name, quantity: item.quantity })),
      };
      const { data, error } = await supabase.functions.invoke('shop-assistant', {
        body: {
          mode: 'chat',
          message: userMessage,
          history,
          identifier: userId ?? getAnonId(),
          requestId,
          context,
        },
      });

      if (error) throw error;

      if (data.credits) {
        setStatus((prev) => prev ? { ...prev, ...data.credits } : prev);
      }

      setMessages((prev) => [...prev, {
        role: 'model',
        content: data.reply || 'I am ready to help.',
        products: data.products,
      }]);

      if (data.action?.type === 'add_to_cart') {
        const action = data.action as PendingAction;
        const product = (data.products || []).find((p: Product) => p.id === action.product_id) as Product | undefined;
        if (product && action.requiresConfirmation) {
          setPendingAction(action);
        } else if (product) {
          const previousQuantity = addProductToCart(product, Number(action.quantity || 1));
          appendAddedMessage(product, Number(action.quantity || 1), previousQuantity);
          rememberEvent(product);
          showToast('Added ' + product.name + ' to your cart');
        }
      }
    } catch (err) {
      console.error('Eldukkan Assistant error:', err);
      let detail = '';
      const context = (err as { context?: Response })?.context;
      if (context) {
        try {
          const body = await context.json();
          detail = body?.error || body?.message || '';
        } catch {
          // Keep the friendly fallback.
        }
      }
      setMessages((prev) => [...prev, {
        role: 'model',
        content: 'Sorry, the assistant could not complete that request.' + (detail ? ' ' + detail : ''),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => { setIsOpen(true); void refreshStatus(); }}
          className="flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white font-black px-5 py-3.5 rounded-2xl shadow-xl hover:scale-[1.02] transition-all"
        >
          <Sparkles size={20} />
          <span>Ask Eldukkan</span>
          {status && <span className="px-2 py-1 rounded-lg bg-white/15 text-xs">{status.unlimited ? '∞' : status.balance}</span>}
        </button>
      ) : (
        <div className="w-[min(420px,calc(100vw-24px))] h-[min(620px,calc(100vh-24px))] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-stone-50 dark:bg-stone-950 p-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center shrink-0"><Bot size={21} /></div>
                <div className="min-w-0">
                  <h3 className="font-black dark:text-white text-sm">Eldukkan Assistant</h3>
                  <p className="text-[11px] text-emerald-500 font-bold mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live catalog</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-2 rounded-xl transition"><X size={19} /></button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2.5">
                <div className="flex items-center gap-2"><Coins size={14} className="text-brand-500" /><span className="text-[10px] uppercase tracking-wide font-black text-stone-400">AI credits</span></div>
                <p className="font-black text-sm dark:text-white mt-1">{status?.unlimited ? 'Unlimited' : (status ? status.balance.toLocaleString('en-EG') : '...')}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2.5">
                <div className="flex items-center gap-2"><Zap size={14} className="text-brand-500" /><span className="text-[10px] uppercase tracking-wide font-black text-stone-400">Renewal</span></div>
                <p className="font-black text-sm dark:text-white mt-1">{status?.unlimited ? 'Always on' : formatRemaining(status?.nextRenewalAt, now)}</p>
              </div>
            </div>
            {status?.memoryEnabled && userId && <p className="text-[10px] text-stone-400 mt-2">Memory is on for this account · shopping preferences only</p>}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={'flex gap-3 ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'model' && <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 mt-1"><Bot size={15} /></div>}
                <div className="max-w-[86%] space-y-2">
                  <div className={'p-3.5 rounded-2xl text-sm leading-relaxed ' + (msg.role === 'user'
                    ? 'bg-brand-500 text-white font-semibold rounded-br-none ml-auto w-fit'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-none')}>
                    {msg.content}
                  </div>
                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-2">
                      {msg.products.slice(0, 3).map((p) => (
                        <Link key={p.id} to={'/product/' + p.id} className="flex items-center gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-2.5 hover:border-brand-500/50 transition">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover bg-stone-100 shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0"><ShoppingBag size={15} className="text-stone-400" /></div>}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs dark:text-white truncate">{p.name}</p>
                            <p className="text-brand-500 font-black text-xs mt-0.5">EGP {p.sale_price ?? p.price}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {msg.cartAction && (
                    <button onClick={() => undoCartAction(msg.cartAction!)} className="inline-flex items-center gap-1.5 text-[11px] font-black text-stone-500 hover:text-brand-500"><RotateCcw size={12} /> Undo cart change</button>
                  )}
                </div>
                {msg.role === 'user' && <div className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0 mt-1"><User size={15} /></div>}
              </div>
            ))}

            {pendingAction && (
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 space-y-3">
                <p className="text-sm font-black dark:text-white">Add {pendingAction.product_name || 'this product'} to your cart?</p>
                <p className="text-xs text-stone-500">Quantity: {pendingAction.quantity} · {pendingAction.creditCost ? pendingAction.creditCost + ' AI credits' : 'No extra action credit'}</p>
                <div className="flex gap-2">
                  <button onClick={confirmAction} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-black disabled:opacity-50"><Check size={14} /> Confirm</button>
                  <button onClick={() => setPendingAction(null)} disabled={loading} className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black dark:text-white">Cancel</button>
                </div>
              </div>
            )}

            {loading && <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold animate-pulse"><Bot size={15} /> Thinking...</div>}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. best headphones under EGP 200"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading || statusLoading}
                className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 dark:text-white disabled:opacity-60"
              />
              <button type="submit" disabled={loading || statusLoading || !input.trim()} className="bg-brand-500 hover:bg-brand-600 text-white p-3 rounded-xl transition shadow-md disabled:opacity-50"><Send size={18} /></button>
            </div>
            {status && !status.unlimited && <p className="text-[10px] text-stone-400 mt-2 text-center">{status.messageCost} credit{status.messageCost === 1 ? '' : 's'} per message · credits renew automatically</p>}
          </form>
        </div>
      )}
    </div>
  );
}
