import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

type Action = 'next' | 'back' | 'skip' | 'finish' | 'open_ai' | 'choose_experience' | 'set_language_en' | 'set_language_ar' | 'set_theme_light' | 'set_theme_dark';
type Step = {
  id: string;
  badge_en: string;
  badge_ar: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  primary_en: string;
  primary_ar: string;
  secondary_en: string;
  secondary_ar: string;
  primary_action: Action;
  secondary_action: Action;
};
type Content = { title_en: string; title_ar: string; intro_en: string; intro_ar: string; steps: Step[] };

const localKey = (version: number) => 'eldukkan-onboarding-completed-v' + version;

const doAction = (action: Action, api: { next: () => void; back: () => void; finish: () => void; setLanguage: (lang: 'en'|'ar') => void; toggleTheme: () => void }) => {
  switch (action) {
    case 'next': api.next(); break;
    case 'back': api.back(); break;
    case 'skip':
    case 'finish': api.finish(); break;
    case 'open_ai':
      window.dispatchEvent(new Event('eldukkan:open-ai'));
      api.finish();
      break;
    case 'choose_experience':
      window.dispatchEvent(new Event('eldukkan:open-experience'));
      break;
    case 'set_language_en': api.setLanguage('en'); break;
    case 'set_language_ar': api.setLanguage('ar'); break;
    case 'set_theme_light':
      if (document.documentElement.classList.contains('dark')) api.toggleTheme();
      break;
    case 'set_theme_dark':
      if (!document.documentElement.classList.contains('dark')) api.toggleTheme();
      break;
  }
};

const normalize = (value: unknown): Content => {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Content>;
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  return {
    title_en: String(raw.title_en || 'Welcome to ElDukkan'),
    title_ar: String(raw.title_ar || 'أهلاً بك في الدكان'),
    intro_en: String(raw.intro_en || ''),
    intro_ar: String(raw.intro_ar || ''),
    steps: steps.map((s, i) => {
      const step = (s && typeof s === 'object' ? s : {}) as Partial<Step>;
      return {
        id: String(step.id || 'step-' + (i + 1)),
        badge_en: String(step.badge_en || 'Step ' + (i + 1)),
        badge_ar: String(step.badge_ar || 'الخطوة ' + (i + 1)),
        title_en: String(step.title_en || 'Step ' + (i + 1)),
        title_ar: String(step.title_ar || 'الخطوة ' + (i + 1)),
        body_en: String(step.body_en || ''),
        body_ar: String(step.body_ar || ''),
        primary_en: String(step.primary_en || 'Next'),
        primary_ar: String(step.primary_ar || 'التالي'),
        secondary_en: String(step.secondary_en || 'Back'),
        secondary_ar: String(step.secondary_ar || 'رجوع'),
        primary_action: (['next','back','skip','finish','open_ai','choose_experience','set_language_en','set_language_ar','set_theme_light','set_theme_dark'].includes(String(step.primary_action)) ? step.primary_action : 'next') as Action,
        secondary_action: (['next','back','skip','finish','open_ai','choose_experience','set_language_en','set_language_ar','set_theme_light','set_theme_dark'].includes(String(step.secondary_action)) ? step.secondary_action : 'back') as Action,
      };
    }),
  };
};

export default function AIOnboarding() {
  const { userId, language, setLanguage, toggleTheme } = useStore();
  const [content, setContent] = useState<Content | null>(null);
  const [version, setVersion] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  const load = async () => {
    setChecking(true);
    const { data } = await supabase.from('ai_onboarding_config').select('enabled,published_version,published_content').eq('id', true).maybeSingle();
    if (!data || data.enabled === false) {
      setChecking(false);
      return;
    }

    const nextVersion = Number(data.published_version || 1);
    const nextContent = normalize(data.published_content);
    let completed = 0;

    if (userId) {
      const { data: state } = await supabase.from('ai_user_onboarding').select('completed_version').eq('user_id', userId).maybeSingle();
      completed = Number(state?.completed_version || 0);
    } else {
      try {
        completed = Number(localStorage.getItem(localKey(nextVersion)) || 0) === nextVersion ? nextVersion : 0;
      } catch {
        completed = 0;
      }
    }

    setContent(nextContent);
    setVersion(nextVersion);
    setStepIndex(0);
    setOpen(completed < nextVersion && nextContent.steps.length > 0);
    setChecking(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('ai-onboarding-published')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_onboarding_config' }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const finish = async () => {
    setOpen(false);
    if (userId) {
      await supabase.rpc('ai_onboarding_complete', { p_user_id: userId, p_version: version });
    } else {
      try { localStorage.setItem(localKey(version), String(version)); } catch { /* optional */ }
    }
  };

  useEffect(() => {
    const replay = () => { setStepIndex(0); setOpen(Boolean(content?.steps.length)); };
    window.addEventListener('eldukkan:replay-onboarding', replay);
    return () => window.removeEventListener('eldukkan:replay-onboarding', replay);
  }, [content]);

  const step = useMemo(() => content?.steps[stepIndex] || null, [content, stepIndex]);
  if (checking || !open || !content || !step) return null;

  const rtl = language === 'ar';
  const next = () => setStepIndex((i) => Math.min(content.steps.length - 1, i + 1));
  const back = () => setStepIndex((i) => Math.max(0, i - 1));
  const run = (action: Action) => doAction(action, { next, back, finish, setLanguage, toggleTheme });

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[min(760px,calc(100vh-24px))] overflow-hidden rounded-[2rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl flex flex-col" dir={rtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" aria-labelledby="eldukkan-onboarding-title">
        <div className="p-5 sm:p-7 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[11px] font-black uppercase tracking-wide"><Sparkles size={13} /> {step.badge_en && rtl ? step.badge_ar : step.badge_en}</div>
              <h2 id="eldukkan-onboarding-title" className="text-2xl sm:text-4xl font-black dark:text-white mt-3">{rtl ? step.title_ar : step.title_en}</h2>
              <p className="text-sm text-stone-500 mt-2 max-w-2xl">{rtl ? step.body_ar : step.body_en}</p>
            </div>
            <button type="button" onClick={() => run('skip')} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500" aria-label={rtl ? 'تخطي' : 'Skip'}><X size={18} /></button>
          </div>
          <div className="mt-5 flex items-center gap-2">
            {content.steps.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-brand-500' : 'bg-stone-200 dark:bg-stone-800'}`} />)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 p-4 sm:p-5">
            <p className="text-[11px] text-stone-400 font-black uppercase tracking-wide">{rtl ? content.title_ar : content.title_en}</p>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mt-2">{rtl ? content.intro_ar : content.intro_en}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button type="button" onClick={() => run('skip')} className="text-xs font-black text-stone-500 hover:text-stone-800 dark:hover:text-white text-left rtl:text-right">{rtl ? 'عدم العرض مرة أخرى' : 'Don’t show this again'}</button>
          <div className="flex items-center gap-2 justify-end">
            {step.secondary_action !== 'skip' && (
              <button
                type="button"
                disabled={step.secondary_action === 'back' && stepIndex === 0}
                onClick={() => run(step.secondary_action)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black dark:text-white disabled:opacity-40"
              >
                <ArrowLeft size={15} /> {rtl ? step.secondary_ar : step.secondary_en}
              </button>
            )}
            <button
              type="button"
              onClick={() => run(step.primary_action === 'next' && stepIndex === content.steps.length - 1 ? 'finish' : step.primary_action)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white text-xs font-black shadow-lg shadow-brand-500/20"
            >
              {stepIndex === content.steps.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}
              {rtl ? step.primary_ar : step.primary_en}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
