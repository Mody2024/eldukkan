import { useState } from 'react';
import { Check, Languages, Sparkles, WandSparkles, X } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';

export default function Onboarding() {
  const { onboardingCompleted, completeOnboarding, language, setLanguage, experience, setExperience, startGuidedTask } = useStore();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [guided, setGuided] = useState(true);

  if (onboardingCompleted) return null;

  const finish = () => {
    completeOnboarding();
    if (guided) {
      startGuidedTask({
        goal: t('onboarding_welcome'),
        steps: [
          { label: t('search'), target: 'search' },
          { label: t('featured'), target: 'products' },
          { label: t('cart'), target: 'cart' },
          { label: t('guided_mode'), target: 'ai' },
        ],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/55 backdrop-blur-sm p-4 flex items-center justify-center">
      <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="w-full max-w-xl storefront-modal p-5 sm:p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="storefront-badge bg-brand-500/10 text-brand-600 dark:text-brand-400"><Sparkles size={14} /> ElDukkan</p>
            <h2 id="onboarding-title" className="text-2xl sm:text-3xl font-black mt-3 dark:text-white">{t('onboarding_welcome')}</h2>
            <p className="text-sm text-stone-500 mt-2">{t('onboarding_intro')}</p>
          </div>
          <button type="button" onClick={completeOnboarding} className="min-w-11 min-h-11 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center" aria-label={t('skip')}><X size={18} /></button>
        </div>

        <div className="flex items-center gap-2 mt-6" aria-label={t('guided_step', { current: step + 1, total: 3 })}>
          {[0,1,2].map((item) => <div key={item} className={'h-1.5 flex-1 rounded-full ' + (item <= step ? 'bg-brand-500' : 'bg-stone-200 dark:bg-stone-700')} />)}
        </div>

        {step === 0 && (
          <section className="mt-6 space-y-4">
            <h3 className="text-lg font-black dark:text-white flex items-center gap-2"><Languages size={20} className="text-brand-500" /> {t('onboarding_language')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['en','ar'] as const).map((lang) => (
                <button key={lang} type="button" onClick={() => setLanguage(lang)} className={'storefront-action border p-4 ' + (language === lang ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-stone-200 dark:border-stone-700')}>
                  <span className="font-black">{lang === 'en' ? 'English' : 'العربية'}</span>
                  {language === lang && <Check size={18} />}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="mt-6 space-y-4">
            <h3 className="text-lg font-black dark:text-white flex items-center gap-2"><WandSparkles size={20} className="text-brand-500" /> {t('onboarding_style')}</h3>
            <div className="space-y-2">
              {([
                ['modern', t('experience_modern'), t('experience_modern_desc')],
                ['heritage', t('experience_heritage'), t('experience_heritage_desc')],
                ['easy', t('experience_easy'), t('experience_easy_desc')],
              ] as const).map(([id,label,desc]) => (
                <button key={id} type="button" onClick={() => setExperience(id)} className={'w-full text-left rtl:text-right p-4 rounded-2xl border transition ' + (experience === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800')}>
                  <span className="block font-black dark:text-white">{label}</span>
                  <span className="block text-xs text-stone-500 mt-1">{desc}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 space-y-4">
            <h3 className="text-lg font-black dark:text-white flex items-center gap-2"><Sparkles size={20} className="text-brand-500" /> {t('onboarding_guidance')}</h3>
            <p className="text-sm text-stone-500">{t('onboarding_guidance_desc')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setGuided(true)} className={'p-4 rounded-2xl border text-left rtl:text-right transition ' + (guided ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}>
                <span className="block font-black dark:text-white">{t('guided_yes')}</span>
                <span className="block text-xs text-stone-500 mt-1">{t('guide_me')}</span>
              </button>
              <button type="button" onClick={() => setGuided(false)} className={'p-4 rounded-2xl border text-left rtl:text-right transition ' + (!guided ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}>
                <span className="block font-black dark:text-white">{t('guided_no')}</span>
                <span className="block text-xs text-stone-500 mt-1">{t('all_products')}</span>
              </button>
            </div>
          </section>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={completeOnboarding} className="storefront-action px-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">{t('skip')}</button>
          <button type="button" onClick={() => step < 2 ? setStep((value) => value + 1) : finish()} className="storefront-action px-5 bg-brand-500 text-white shadow-lg shadow-brand-500/20">
            {step < 2 ? t('continue') : t('finish')}
          </button>
        </div>
      </div>
    </div>
  );
}
