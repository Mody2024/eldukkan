import { useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';

export default function ExperiencePicker() {
  const [open, setOpen] = useState(false);
  const { experience, setExperience } = useStore();
  const { t } = useTranslation();

  const options = [
    { id: 'modern' as const, label: t('experience_modern'), description: t('experience_modern_desc') },
    { id: 'heritage' as const, label: t('experience_heritage'), description: t('experience_heritage_desc') },
    { id: 'easy' as const, label: t('experience_easy'), description: t('experience_easy_desc') },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-brand-500 transition flex items-center gap-1.5 font-bold text-xs"
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('store_experience')}
      >
        <Palette size={16} />
        <span className="hidden lg:inline">{t('experience_short')}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-[min(320px,calc(100vw-24px))] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 shadow-2xl z-[70]"
        >
          <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800">
            <p className="text-xs font-black text-stone-500 uppercase tracking-wide">{t('store_experience')}</p>
          </div>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => { setExperience(option.id); setOpen(false); }}
              className={`w-full text-left rtl:text-right p-3 rounded-xl flex items-start gap-3 transition ${experience === option.id ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}
              role="menuitemradio"
              aria-checked={experience === option.id}
            >
              <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${experience === option.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 dark:border-stone-600 text-transparent'}`}>
                <Check size={13} />
              </span>
              <span className="min-w-0">
                <span className="block font-black text-sm">{option.label}</span>
                <span className="block text-xs text-stone-500 mt-0.5 leading-relaxed">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
