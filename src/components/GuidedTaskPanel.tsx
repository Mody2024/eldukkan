import { Check, ChevronLeft, Circle, X } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { useGuidedTask } from '../hooks/useGuidedTask';

type Props = {
  compact?: boolean;
  onComplete?: () => void;
};

export default function GuidedTaskPanel({ compact = false, onComplete }: Props) {
  const { task, stepIndex, progress, currentStep, next, previous, stop } = useGuidedTask();
  const { t, language } = useTranslation();

  if (!task || !currentStep) return null;

  const doneCount = Math.min(stepIndex, task.steps.length);
  const isLast = stepIndex >= task.steps.length - 1;

  const finish = () => {
    if (isLast) {
      stop();
      window.dispatchEvent(new Event('eldukkan:guided-complete'));
      onComplete?.();
      return;
    }
    next();
  };

  return (
    <section
      aria-label={t('guided_mode')}
      className={
        'rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900 ' +
        (compact ? 'p-3' : 'p-4')
      }
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-brand-500">
            {t('guided_mode')} · {Math.round(progress * 100)}%
          </p>
          <h3 className="mt-1 font-black text-sm dark:text-white">{task.goal}</h3>
          <p className="mt-1 text-[11px] text-stone-500">
            {language === 'ar'
              ? 'أنجز ' + doneCount + ' من ' + task.steps.length + ' خطوات. نفّذ الخطوة الحالية بنفسك.'
              : doneCount + ' of ' + task.steps.length + ' steps completed. Complete the current step yourself.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            stop();
            window.dispatchEvent(new Event('eldukkan:guided-stop'));
          }}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
          aria-label={t('stop_guidance')}
        >
          <X size={16} />
        </button>
      </div>

      <ol className="mt-3 space-y-1.5">
        {task.steps.slice(0, 10).map((step, index) => {
          const complete = index < stepIndex;
          const active = index === stepIndex;
          return (
            <li key={step.id || (step.target + '-' + index)} className="flex items-start gap-2 text-xs">
              {complete ? <Check size={14} className="mt-0.5 text-emerald-500" /> : active ? <Circle size={14} className="mt-0.5 fill-brand-500 text-brand-500" /> : <Circle size={14} className="mt-0.5 text-stone-300 dark:text-stone-700" />}
              <span className={active ? 'font-black text-stone-900 dark:text-white' : 'font-semibold text-stone-500'}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={previous} disabled={stepIndex === 0} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 dark:text-white disabled:opacity-30" aria-label={t('guided_previous')}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={finish} className="flex-1 min-h-11 rounded-xl bg-brand-500 px-4 text-xs font-black text-white">
          {isLast ? t('finish') : t('guided_done_next')}
        </button>
      </div>
    </section>
  );
}
