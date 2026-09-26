import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BrainCircuit, EyeOff, Trash2 } from 'lucide-react';

interface Props {
  userId: string;
}

interface Preferences {
  last_language?: string;
  last_theme?: string;
  last_page?: string;
  last_category?: string;
  category_interest_counts?: Record<string, number>;
  interested_products?: { id: string; name: string; count: number }[];
}

export default function AIMemoryCard({ userId }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('ai_memory').select('enabled, preferences').eq('user_id', userId).maybeSingle();
    setEnabled(data?.enabled ?? true);
    setPreferences((data?.preferences || {}) as Preferences);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [userId]);

  const toggle = async () => {
    setSaving(true);
    const next = !enabled;
    const { error } = await supabase.from('ai_memory').upsert({
      user_id: userId,
      enabled: next,
      preferences,
      recent_history: [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (!error) setEnabled(next);
    setSaving(false);
  };

  const clearMemory = async () => {
    if (!window.confirm('Forget all saved AI memory for this account?')) return;
    setSaving(true);
    const { error } = await supabase.from('ai_memory').upsert({
      user_id: userId,
      enabled,
      preferences: {},
      recent_history: [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (!error) setPreferences({});
    setSaving(false);
  };

  const categories = Object.entries(preferences.category_interest_counts || {}).slice(0, 5);
  const products = (preferences.interested_products || []).slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><BrainCircuit size={19} /></div>
        <div>
          <h2 className="text-lg font-black dark:text-white">AI Memory</h2>
          <p className="text-xs text-stone-500 mt-1">Eldukkan can remember shopping preferences, not sensitive account details.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6">
        {loading ? <p className="text-sm text-stone-500">Loading memory settings...</p> : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-black dark:text-white">{enabled ? 'Memory is on' : 'Memory is off'}</p>
                <p className="text-xs text-stone-500 mt-1">{enabled ? 'Future AI chats may use these preferences to make shopping easier.' : 'New AI chats will not save persistent memory.'}</p>
              </div>
              <button onClick={toggle} disabled={saving} className={'px-4 py-2.5 rounded-xl text-xs font-black ' + (enabled ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300')}>{enabled ? 'On' : 'Off'}</button>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Recent preferences</p>
                <div className="mt-2 space-y-1 text-xs font-bold text-stone-700 dark:text-stone-200">
                  {preferences.last_language && <p>Language: {preferences.last_language}</p>}
                  {preferences.last_theme && <p>Theme: {preferences.last_theme}</p>}
                  {preferences.last_category && <p>Latest category: {preferences.last_category}</p>}
                  {!preferences.last_language && !preferences.last_theme && !preferences.last_category && <p className="text-stone-400">Nothing saved yet.</p>}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Categories you often browse</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {categories.length ? categories.map(([name, count]) => <span key={name} className="px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500 text-[10px] font-black">{name} · {count}</span>) : <p className="text-xs text-stone-400">Not enough activity yet.</p>}
                </div>
              </div>
            </div>

            {products.length > 0 && (
              <div className="mt-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Products you showed interest in</p>
                <div className="mt-2 space-y-2">
                  {products.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold dark:text-white truncate">{product.name}</span><span className="text-stone-400 shrink-0">{product.count}x</span></div>)}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={clearMemory} disabled={saving} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-black"><Trash2 size={14} /> Forget everything</button>
              {!enabled && <span className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 text-xs font-bold"><EyeOff size={14} /> Persistent memory disabled</span>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
