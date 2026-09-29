import { useEffect, useRef, useState } from 'react';
import { LocateFixed, X } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import GuidedTaskPanel from './GuidedTaskPanel';

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
      const av = Math.max(0, Math.min(window.innerWidth, ar.right) - Math.max(0, ar.left))
        * Math.max(0, Math.min(window.innerHeight, ar.bottom) - Math.max(0, ar.top));
      const bv = Math.max(0, Math.min(window.innerWidth, br.right) - Math.max(0, br.left))
        * Math.max(0, Math.min(window.innerHeight, br.bottom) - Math.max(0, br.top));
      return bv - av;
    })[0] || null;
}

function getTooltipPlacement(rect: DOMRect, height: number, rtl: boolean) {
  const bottomClearance = 80 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-bottom-nav-space')) || 0);
  const topRoom = rect.top - 16;
  const bottomRoom = window.innerHeight - rect.bottom - bottomClearance;
  const placeBelow = bottomRoom >= height || bottomRoom >= topRoom;
  const top = placeBelow
    ? Math.min(window.innerHeight - height - 16, rect.bottom + 14)
    : Math.max(16, rect.top - height - 14);

  return {
    top,
    side: rtl
      ? { right: 16 }
      : { left: 16 },
  };
}

export default function GuidedSpotlight() {
  const { guidedMode, guidedTask, guidedStepIndex, nextGuidedStep, stopGuidedTask } = useStore();
  const { t, language } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const lastScrolledTarget = useRef<string | null>(null);
  const rtl = language === 'ar';

  const target = guidedTask?.steps[guidedStepIndex]?.target || '';

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
    const refresh = () => update();
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);

    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });

    const timer = window.setInterval(update, 350);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [guidedMode, guidedStepIndex, target]);

  useEffect(() => {
    if (!guidedMode || !target) return;

    const onUserAction = (event: Event) => {
      const node = findTarget(target);
      if (!node) return;

      const targetNode = event.target as Node | null;
      if (!targetNode || (targetNode !== node && !node.contains(targetNode))) return;

      const tag = node.tagName.toLowerCase();
      const inputType = node instanceof HTMLInputElement ? node.type : '';

      if ((tag === 'input' || tag === 'textarea') && inputType !== 'checkbox' && inputType !== 'radio') {
        if (event.type === 'input') return;
        if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Enter') return;
      }

      window.setTimeout(() => nextGuidedStep(), 180);
    };

    document.addEventListener('click', onUserAction, true);
    document.addEventListener('change', onUserAction, true);
    document.addEventListener('keydown', onUserAction, true);

    return () => {
      document.removeEventListener('click', onUserAction, true);
      document.removeEventListener('change', onUserAction, true);
      document.removeEventListener('keydown', onUserAction, true);
    };
  }, [guidedMode, target, guidedStepIndex, nextGuidedStep]);

  const handleStop = () => {
    stopGuidedTask();
    window.dispatchEvent(new Event('eldukkan:guided-stop'));
  };

  if (!guidedMode || !guidedTask || !guidedTask.steps[guidedStepIndex]) return null;

  const current = guidedTask.steps[guidedStepIndex];
  const placement = rect
    ? getTooltipPlacement(rect, window.innerWidth < 640 ? 245 : 260, rtl)
    : { top: 90, side: rtl ? { right: 16 } : { left: 16 } };

  return (
    <>
      <div className="fixed inset-0 z-[75] pointer-events-none" aria-hidden="true">
        {targetFound && rect ? (
          <div
            className="absolute rounded-2xl border-2 border-brand-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.62),0_0_26px_rgba(201,106,46,0.28)] transition-all duration-200"
            style={{
              left: Math.max(4, rect.left - 5),
              top: Math.max(4, rect.top - 5),
              width: Math.min(window.innerWidth - 8, rect.width + 10),
              height: Math.min(window.innerHeight - 8, rect.height + 10),
            }}
          />
        ) : <div className="absolute inset-0 bg-stone-950/55" />}
      </div>

      <div
        className="fixed z-[80] w-[calc(100vw-32px)] max-w-[390px]"
        style={{ top: placement.top, ...placement.side }}
      >
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl p-3.5 pointer-events-auto">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0"><LocateFixed size={17} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-brand-500">{t('guided_mode')}</p>
              <p className="font-black text-sm dark:text-white mt-1">{current.label}</p>
              {!targetFound && <p className="text-[11px] text-stone-500 mt-2">{t('guided_waiting')}</p>}
            </div>
            <button type="button" onClick={handleStop} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white" aria-label={t('stop_guidance')}><X size={16} /></button>
          </div>

          <div className="mt-3">
            <GuidedTaskPanel compact />
          </div>
        </div>
      </div>
    </>
  );
}
