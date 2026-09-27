import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';

export default function GuideOverlay() {
  const { guidedMode, guidedTask, guidedStepIndex, nextGuidedStep, previousGuidedStep, stopGuidedTask } = useStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = guidedTask?.steps[guidedStepIndex];

  useEffect(() => {
    if (!guidedMode || !guidedTask || !step) return;
    if (step.path && location.pathname !== step.path) {
      navigate(step.path);
      return;
    }
    const update = () => {
      const element = document.querySelector('[data-guide="' + step.target + '"]') as HTMLElement | null;
      setRect(element ? element.getBoundingClientRect() : null);
    };
    const timer = window.setTimeout(update, 100);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [guidedMode, guidedTask, step, location.pathname, navigate]);

  useEffect(() => {
    if (!guidedMode || !step) return;
    const element = document.querySelector('[data-guide="' + step.target + '"]') as HTMLElement | null;
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [guidedMode, step?.target, location.pathname]);

  if (!guidedMode || !guidedTask || !step) return null;

  const completed = guidedStepIndex >= guidedTask.steps.length - 1;
  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  const left = rect ? Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16)) : 16;
  const top = rect ? Math.min(window.innerHeight - 170, rect.bottom + 14) : 84;

  return (
    <div className="fixed inset-0 z-[95] pointer-events-none" aria-live="polite">
      <div className="absolute inset-0 bg-stone-950/45" />
      {rect && (
        <div className="absolute rounded-2xl border-2 border-brand-400 shadow-[0_0_0_9999px_rgba(28,22,18,0.45)] transition-all duration-300" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      )}
      <div className="absolute pointer-events-auto storefront-modal p-4 w-[calc(100vw-32px)] max-w-[320px]" style={{ left, top }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-brand-500">{t('guided_mode')}</p>
            <p className="text-sm font-black dark:text-white mt-1">{step.label}</p>
          </div>
          <button type="button" onClick={stopGuidedTask} className="min-w-10 min-h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500" aria-label={t('stop_guidance')}><X size={17} /></button>
        </div>
        <p className="text-xs text-stone-500 mt-2">{t('guided_step', { current: guidedStepIndex + 1, total: guidedTask.steps.length })}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={previousGuidedStep} disabled={guidedStepIndex === 0} className="storefront-action px-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40"><ArrowLeft size={15} /> {t('back')}</button>
          <button type="button" onClick={nextGuidedStep} className="storefront-action px-4 bg-brand-500 text-white">{completed ? t('finish') : t('next')} <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  );
}
