import { useEffect, useState } from 'react';
import { Check, Heart, Save, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

type Props = { userId: string };

type Preferences = {
  categories: string[];
  budget: 'under_500' | '500_1500' | '1500_3000' | '3000_plus';
  goal: 'specific' | 'browse' | 'compare';
  assistant: 'self' | 'ask' | 'guided';
};

const fallback: Preferences = { categories: [], budget: '500_1500', goal: 'browse', assistant: 'ask' };

export default function CustomerPreferencesCard({ userId }: Props) {
  const language = useStore((s) => s.language);
  const t = language === 'ar';
  const [preferences, setPreferences] = useState<Preferences>(fallback);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: row }, { data: productRows }] = await Promise.all([
        supabase.from('customer_preferences').select('preferred_categories,budget_band,shopping_goal,assistant_mode').eq('user_id', userId).maybeSingle(),
        supabase.from('products').select('category').eq('is_active', true).not('category', 'is', null).limit(120),
      ]);
      setCategories(Array.from(new Set((productRows ?? []).map((item) => String(item.category || '').trim()).filter(Boolean))).slice(0, 18));
      if (row) {
        setPreferences({
          categories: Array.isArray(row.preferred_categories) ? row.preferred_categories.slice(0, 5) : [],
          budget: row.budget_band || fallback.budget,
          goal: row.shopping_goal || fallback.goal,
          assistant: row.assistant_mode || fallback.assistant,
        });
      }
      setLoaded(true);
    };
    void load();
  }, [userId]);

  const toggleCategory = (category: string) => {
    setPreferences((current) => current.categories.includes(category)
      ? { ...current, categories: current.categories.filter((item) => item !== category) }
      : current.categories.length < 5 ? { ...current, categories: [...current.categories, category] } : current);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('customer_preferences').upsert({
      user_id: userId,
      preferred_categories: preferences.categories,
      budget_band: preferences.budget,
      shopping_goal: preferences.goal,
      assistant_mode: preferences.assistant,
      language,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) return;
    try { localStorage.setItem('eldukkan-shopping-preferences-v1', JSON.stringify(preferences)); } catch {}
  };

  if (!loaded) return <div className="storefront-card p-5 text-sm text-stone-500">{t ? 'جارٍ تحميل تفضيلاتك…' : 'Loading your shopping preferences…'}</div>;

  const budgets = t
    ? [['under_500','أقل من 500 جنيه'],['500_1500','500–1,500 جنيه'],['1500_3000','1,500–3,000 جنيه'],['3000_plus','3,000 جنيه+']]
    : [['under_500','Under EGP 500'],['500_1500','EGP 500–1,500'],['1500_3000','EGP 1,500–3,000'],['3000_plus','EGP 3,000+']];
  const goals = t
    ? [['specific','عايز حاجة معينة'],['browse','بحب أتصفح'],['compare','ساعدني أقارن']]
    : [['specific','I know what I want'],['browse','I like to browse'],['compare','Help me compare']];
  const assistants = t
    ? [['self','لما أطلب فقط'],['ask','اقترح المساعدة لما تفيد'],['guided','وجّهني خطوة بخطوة']]
    : [['self','Only when I ask'],['ask','Suggest help when useful'],['guided','Guide me step by step']];

  return (
    <section className="storefront-card p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><SlidersHorizontal size={18} /></div>
          <div>
            <h2 className="font-black dark:text-white">{t ? 'تفضيلات التسوق' : 'Shopping preferences'}</h2>
            <p className="text-xs text-stone-500 mt-1">{t ? 'غيّر الاختيارات اللي بتأثر على اقتراحاتك.' : 'Change the choices used to make shopping help more relevant.'}</p>
          </div>
        </div>
        <Heart size={18} className="text-stone-400" />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-black text-stone-500">{t ? 'الفئات' : 'Categories'}</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => <button key={category} type="button" onClick={() => toggleCategory(category)} className={'px-3 py-2 rounded-xl border text-xs font-black ' + (preferences.categories.includes(category) ? 'bg-brand-500 border-brand-500 text-white' : 'border-stone-200 dark:border-stone-700 dark:text-stone-200')}>{preferences.categories.includes(category) && <Check size={12} className="inline mr-1" />}{category}</button>)}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-black text-stone-500">{t ? 'الميزانية المعتادة' : 'Typical budget'}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{budgets.map(([id,label]) => <button key={id} type="button" onClick={() => setPreferences((p) => ({ ...p, budget: id as Preferences['budget'] }))} className={'p-3 rounded-xl border-2 text-xs font-black ' + (preferences.budget === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}>{label}</button>)}</div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-black text-stone-500">{t ? 'طريقة التسوق' : 'Shopping style'}</p>
        <div className="grid sm:grid-cols-3 gap-2">{goals.map(([id,label]) => <button key={id} type="button" onClick={() => setPreferences((p) => ({ ...p, goal: id as Preferences['goal'] }))} className={'p-3 rounded-xl border-2 text-xs font-black text-left rtl:text-right ' + (preferences.goal === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}>{label}</button>)}</div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-black text-stone-500">{t ? 'المساعد' : 'Assistant behavior'}</p>
        <div className="grid sm:grid-cols-3 gap-2">{assistants.map(([id,label]) => <button key={id} type="button" onClick={() => setPreferences((p) => ({ ...p, assistant: id as Preferences['assistant'] }))} className={'p-3 rounded-xl border-2 text-xs font-black text-left rtl:text-right ' + (preferences.assistant === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}>{label}</button>)}</div>
      </div>

      <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs inline-flex items-center gap-2 disabled:opacity-50"><Save size={14} /> {saving ? (t ? 'جارٍ الحفظ…' : 'Saving…') : (t ? 'حفظ التفضيلات' : 'Save preferences')}</button></div>
    </section>
  );
}
