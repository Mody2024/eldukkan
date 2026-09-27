import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, Plus, Save, Send, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

type Content = {
  title_en: string;
  title_ar: string;
  intro_en: string;
  intro_ar: string;
  steps: Step[];
};

interface Props {
  showToast: (message: string) => void;
}

const ACTIONS: { value: Action; label: string }[] = [
  { value: 'next', label: 'Next step' },
  { value: 'back', label: 'Previous step' },
  { value: 'skip', label: 'Skip / finish' },
  { value: 'finish', label: 'Finish tour' },
  { value: 'open_ai', label: 'Open AI assistant' },
  { value: 'choose_experience', label: 'Open experience picker' },
  { value: 'set_language_en', label: 'Switch to English' },
  { value: 'set_language_ar', label: 'Switch to Arabic' },
  { value: 'set_theme_light', label: 'Use light theme' },
  { value: 'set_theme_dark', label: 'Use dark theme' },
];

const blankStep = (index: number): Step => ({
  id: 'step-' + (index + 1),
  badge_en: 'Step ' + (index + 1),
  badge_ar: 'الخطوة ' + (index + 1),
  title_en: 'New onboarding step',
  title_ar: 'خطوة جديدة',
  body_en: 'Explain what the customer should know or do next.',
  body_ar: 'اكتب هنا التفاصيل التي تريد أن يعرفها العميل في هذه الخطوة.',
  primary_en: 'Next',
  primary_ar: 'التالي',
  secondary_en: 'Back',
  secondary_ar: 'رجوع',
  primary_action: 'next',
  secondary_action: 'back',
});

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
        ...blankStep(i),
        ...step,
        id: String(step.id || 'step-' + (i + 1)),
        primary_action: (ACTIONS.some((a) => a.value === step.primary_action) ? step.primary_action : 'next') as Action,
        secondary_action: (ACTIONS.some((a) => a.value === step.secondary_action) ? step.secondary_action : 'back') as Action,
      };
    }),
  };
};

export default function AIOnboardingControl({ showToast }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [publishedVersion, setPublishedVersion] = useState(1);
  const [draft, setDraft] = useState<Content>(normalize({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [selectedStep, setSelectedStep] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_onboarding_config').select('*').eq('id', true).maybeSingle();
    if (error || !data) {
      showToast('Could not load onboarding settings.');
      setLoading(false);
      return;
    }
    setEnabled(Boolean(data.enabled));
    setPublishedVersion(Number(data.published_version || 1));
    setDraft(normalize(data.draft_content || data.published_content));
    setSelectedStep(0);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateDraft = (patch: Partial<Content>) => setDraft((current) => ({ ...current, ...patch }));
  const updateStep = (index: number, patch: Partial<Step>) => setDraft((current) => ({
    ...current,
    steps: current.steps.map((step, i) => i === index ? { ...step, ...patch } : step),
  }));

  const save = async (publish: boolean) => {
    if (!draft.steps.length) {
      showToast('Add at least one onboarding step before saving.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('ai_admin_save_onboarding', {
      p_draft: draft,
      p_publish: publish,
    });
    if (error) {
      showToast('Could not save onboarding: ' + error.message);
      setSaving(false);
      return;
    }
    const next = data as Record<string, unknown>;
    setPublishedVersion(Number(next.published_version || publishedVersion));
    setDraft(normalize(next.draft_content));
    setEnabled(Boolean(next.enabled));
    if (publish) showToast('New onboarding published. Users will see this new version once.');
    else showToast('Onboarding draft saved — not public yet.');
    setSaving(false);
  };

  const toggleEnabled = async () => {
    setEnabled((value) => !value);
    const nextEnabled = !enabled;
    const { error } = await supabase.from('ai_onboarding_config').update({ enabled: nextEnabled, updated_at: new Date().toISOString() }).eq('id', true);
    if (error) {
      setEnabled(enabled);
      showToast('Could not change onboarding visibility.');
    } else {
      showToast(nextEnabled ? 'Onboarding enabled.' : 'Onboarding disabled.');
    }
  };

  const addStep = () => {
    if (draft.steps.length >= 12) {
      showToast('Maximum 12 onboarding steps.');
      return;
    }
    setDraft((current) => ({ ...current, steps: [...current.steps, blankStep(current.steps.length)] }));
    setSelectedStep(draft.steps.length);
  };

  const removeStep = (index: number) => {
    if (draft.steps.length <= 1) {
      showToast('Keep at least one step.');
      return;
    }
    setDraft((current) => ({ ...current, steps: current.steps.filter((_, i) => i !== index) }));
    setSelectedStep(Math.max(0, Math.min(selectedStep, draft.steps.length - 2)));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.steps.length) return;
    setDraft((current) => {
      const next = [...current.steps];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, steps: next };
    });
    setSelectedStep(target);
  };

  const activeStep = draft.steps[selectedStep] || draft.steps[0];

  const inputClass = 'w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-brand-500 outline-none font-bold dark:text-white text-sm';
  const cardClass = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl';

  const previewSteps = useMemo(() => draft.steps.slice(0, 6), [draft.steps]);

  if (loading) return <div className={cardClass + ' p-6 text-sm text-stone-500'}>Loading onboarding editor...</div>;

  return (
    <section className={cardClass + ' p-5 sm:p-6 space-y-5'}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Send size={18} /></div>
            <div>
              <h3 className="text-lg font-black dark:text-white">Onboarding publisher</h3>
              <p className="text-xs text-stone-500 mt-1">Draft changes stay private until you publish. Publishing increments the version so existing users get the new tour once.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">Published v{publishedVersion}</span>
          <button type="button" onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black dark:text-white">{preview ? <EyeOff size={14} /> : <Eye size={14} />} {preview ? 'Close preview' : 'Preview draft'}</button>
          <button type="button" onClick={toggleEnabled} className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black ${enabled ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-white'}`}>
            <CheckCircle2 size={14} /> {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[250px_1fr] gap-5">
        <div className="space-y-2">
          {draft.steps.map((step, index) => (
            <div key={step.id + '-' + index} className={`rounded-2xl border p-2 ${selectedStep === index ? 'border-brand-500 bg-brand-500/5' : 'border-stone-200 dark:border-stone-800'}`}>
              <button type="button" onClick={() => setSelectedStep(index)} className="w-full text-left rtl:text-right px-2 py-2">
                <p className="text-[10px] uppercase font-black text-stone-400">{index + 1}</p>
                <p className="text-sm font-black dark:text-white truncate">{step.title_en || 'Untitled step'}</p>
                <p className="text-[10px] text-stone-500 truncate">{step.title_ar || ''}</p>
              </button>
              <div className="flex items-center gap-1 px-1 pb-1">
                <button type="button" disabled={index === 0} onClick={() => moveStep(index, -1)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30" aria-label="Move step up"><ArrowUp size={13} /></button>
                <button type="button" disabled={index === draft.steps.length - 1} onClick={() => moveStep(index, 1)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30" aria-label="Move step down"><ArrowDown size={13} /></button>
                <button type="button" onClick={() => removeStep(index)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 ml-auto" aria-label="Delete step"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addStep} className="w-full inline-flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 text-xs font-black text-stone-500 hover:text-brand-500 hover:border-brand-500/50"><Plus size={14} /> Add onboarding step</button>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Tour title — English</span><input value={draft.title_en} onChange={(e) => updateDraft({ title_en: e.target.value })} className={inputClass} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">عنوان الجولة — عربي</span><input value={draft.title_ar} onChange={(e) => updateDraft({ title_ar: e.target.value })} className={inputClass} dir="rtl" /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Intro — English</span><textarea value={draft.intro_en} onChange={(e) => updateDraft({ intro_en: e.target.value })} className={inputClass + ' min-h-20'} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">المقدمة — عربي</span><textarea value={draft.intro_ar} onChange={(e) => updateDraft({ intro_ar: e.target.value })} className={inputClass + ' min-h-20'} dir="rtl" /></label>
          </div>

          {activeStep && (
            <div className="rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black dark:text-white">Step {selectedStep + 1} editor</p>
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">{activeStep.id}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  ['badge_en','Badge — English'],['badge_ar','الشارة — عربي'],['title_en','Title — English'],['title_ar','العنوان — عربي'],
                  ['body_en','Details — English'],['body_ar','التفاصيل — عربي'],['primary_en','Primary button — English'],['primary_ar','الزر الأساسي — عربي'],
                  ['secondary_en','Secondary button — English'],['secondary_ar','الزر الثانوي — عربي'],
                ] as [keyof Step,string][]).map(([key,label]) => (
                  <label key={key} className="space-y-2"><span className="text-[11px] font-black text-stone-500">{label}</span>{key.startsWith('body') ? <textarea value={activeStep[key] as string} onChange={(e) => updateStep(selectedStep,{[key]:e.target.value})} className={inputClass + ' min-h-24'} dir={key.endsWith('_ar') ? 'rtl' : 'ltr'} /> : <input value={activeStep[key] as string} onChange={(e) => updateStep(selectedStep,{[key]:e.target.value})} className={inputClass} dir={key.endsWith('_ar') ? 'rtl' : 'ltr'} />}</label>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Primary button action</span><select value={activeStep.primary_action} onChange={(e) => updateStep(selectedStep,{primary_action:e.target.value as Action})} className={inputClass}>{ACTIONS.map((a)=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
                <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Secondary button action</span><select value={activeStep.secondary_action} onChange={(e) => updateStep(selectedStep,{secondary_action:e.target.value as Action})} className={inputClass}>{ACTIONS.map((a)=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
              </div>
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="rounded-3xl border border-brand-500/20 bg-brand-500/5 p-5">
          <p className="text-[10px] uppercase font-black tracking-wide text-brand-600 dark:text-brand-400 mb-3">Draft preview</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {previewSteps.map((step,index)=>(
              <div key={step.id+'-preview'} className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 space-y-2">
                <p className="text-[10px] uppercase font-black text-brand-500">{step.badge_en}</p>
                <p className="font-black dark:text-white">{step.title_en}</p>
                <p className="text-xs text-stone-500 leading-relaxed line-clamp-4">{step.body_en}</p>
                <div className="flex gap-2 pt-1"><span className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-brand-500 text-white">{step.primary_en}</span><span className="text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800">{step.secondary_en}</span></div>
                <span className="text-[9px] text-stone-400">Step {index+1}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-stone-500">Published copy is currently kept separate and is not changed by this preview.</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800 pt-4">
        <div><p className="text-xs font-black dark:text-white">Ready to publish?</p><p className="text-[11px] text-stone-500">Every publish creates a new version. Completed users will see the refreshed tour once; new users always see the latest version.</p></div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" disabled={saving} onClick={() => save(false)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black dark:text-white disabled:opacity-50"><Save size={14} /> Save draft</button>
          <button type="button" disabled={saving} onClick={() => save(true)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500 text-white text-xs font-black disabled:opacity-50"><Send size={14} /> {saving ? 'Publishing...' : 'Publish new version'}</button>
        </div>
      </div>
    </section>
  );
}
