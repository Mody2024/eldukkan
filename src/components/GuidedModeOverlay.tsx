import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LocateFixed, X } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';

function findTarget(target: string): HTMLElement | null {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(target)) return null;
  const nodes = Array.from(document.querySelectorAll('[data-ai-target="' + target + '"]')) as HTMLElement[];
  return nodes
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const av = Math.max(0, Math.min(window.innerWidth, ar.right) - Math.max(0, ar.left)) * Math.max(0, Math.min(window.innerHeight, ar.bottom) - Math.max(0, ar.top));
      const bv = Math.max(0, Math.min(window.innerWidth, br.right) - Math.max(0, br.left)) * Math.max(0, Math.min(window.innerHeight, br.bottom) - Math.max(0, br.top));
      return bv - av;
    })[0] || null;
}

export default function GuidedModeOverlay() {
  const { guidedMode, guidedTask, guidedStepIndex, nextGuidedStep, previousGuidedStep, stopGuidedTask } = useStore();
  const { t } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const lastScrolledTarget = useRef<string | null>(null);

  const target = guidedTask?.steps[guidedStepIndex]?.target || '';
  const label = guidedTask?.steps[guidedStepIndex]?.label || t('guided_mode');

  const update = () => {
    if (!guidedMode || !target) {
      setRect(null);
      setTargetFound(false);
      return;
    }
    const node = findTarget(target);
    if (!node) {
      setRect(null);
      setTargetFound(false);
      lastScrolledTarget.current = null;
      return;
    }
    if (lastScrolledTarget.current !== target) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      lastScrolledTarget.current = target;
    }
    setRect(node.getBoundingClientRect());
    setTargetFound(true);
  };

  useEffect(() => {
    update();
    const resize = () => update();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', resize, true);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    const timer = window.setInterval(update, 500);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', resize, true);
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [guidedMode, target, guidedStepIndex]);

  useEffect(() => {
    if (!guidedMode || !target) return;
    const onAction = (event: Event) => {
      const node = findTarget(target);
      if (!node) return;
      const targetNode = event.target as Node | null;
      if (!targetNode || (targetNode !== node && !node.contains(targetNode))) return;

      const tag = node.tagName.toLowerCase();
      const type = node instanceof HTMLInputElement ? node.type : '';
      const eventType = event.type;

      // Do not advance on every keystroke. Text inputs advance on commit
      // (change/Enter), while buttons/links and selection controls advance
      // from their actual user action.
      if ((tag === 'input' || tag === 'textarea') && type !== 'checkbox' && type !== 'radio') {
        if (eventType === 'input') return;
        if (eventType === 'keydown') {
          const key = (event as KeyboardEvent).key;
          if (key !== 'Enter') return;
        }
      }

      window.setTimeout(() => nextGuidedStep(), 180);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const node = findTarget(target);
      if (!node) return;
      const targetNode = event.target as Node | null;
      if (!targetNode || (targetNode !== node && !node.contains(targetNode))) return;
      if ((node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') && event.key === 'Enter') {
        window.setTimeout(() => nextGuidedStep(), 180);
      }
    };

    document.addEventListener('click', onAction, true);
    document.addEventListener('change', onAction, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('click', onAction, true);
      document.removeEventListener('change', onAction, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [guidedMode, target, guidedStepIndex, nextGuidedStep]);

  const progress = guidedTask ? Math.min(1, (guidedStepIndex + 1) / guidedTask.steps.length) : 0;
  const current = guidedTask?.steps[guidedStepIndex];

  if (!guidedMode || !guidedTask || !current) return null;

  return (
    <>
      <div className="fixed inset-0 z-[75] pointer-events-none" aria-hidden="true">
        {targetFound && rect ? (
          <div
            className="absolute rounded-2xl border-2 border-brand-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.62),0_0_32px_rgba(201,106,46,0.55)] transition-all duration-200"
            style={{ left: Math.max(4, rect.left - 5), top: Math.max(4, rect.top - 5), width: Math.min(window.innerWidth - 8, rect.width + 10), height: Math.min(window.innerHeight - 8, rect.height + 10) }}
          />
        ) : (
          <div className="absolute inset-0 bg-stone-950/55" />
        )}
      </div>

      <div className="fixed left-3 right-3 sm:left-auto sm:right-6 bottom-20 sm:bottom-6 z-[80] w-auto sm:w-[min(390px,calc(100vw-48px))]">
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl p-4 pointer-events-auto">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0"><LocateFixed size={17} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-brand-500">{t('guided_mode')} · {Math.round(progress*100)}%</p>
              <p className="font-black text-sm dark:text-white mt-1">{label}</p>
              {!targetFound && <p className="text-[11px] text-stone-500 mt-2">{t('guided_waiting')}</p>}
            </div>
            <button type="button" onClick={stopGuidedTask} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white" aria-label={t('stop_guidance')}><X size={16} /></button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-stone-400">
            <span>{t('guided_step', { current: guidedStepIndex + 1, total: guidedTask.steps.length })}</span>
            <span>{current.target}</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={previousGuidedStep} disabled={guidedStepIndex === 0} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 dark:text-white disabled:opacity-30" aria-label={t('guided_previous')}><ChevronLeft size={16} /></button>
            <button type="button" onClick={nextGuidedStep} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-black"><Check size={14} /> {t('guided_done_next')}</button>
          </div>
        </div>
      </div>
    </>
  );
}
