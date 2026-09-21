import { useEffect, useState } from 'react';
import { useStore } from '../store';

const SESSION_KEY = 'eldukkan-intro-shown';

export default function ShopIntro() {
  const storeName = useStore((s) => s.storeName);
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY));
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SESSION_KEY, 'true');
    const startTimer = setTimeout(() => setOpening(true), 550);
    return () => clearTimeout(startTimer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center overflow-hidden transition-transform duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${opening ? '-translate-y-full' : 'translate-y-0'}`}
      onTransitionEnd={() => setVisible(false)}
      aria-hidden="true"
    >
      {/* The shutter itself: horizontal slats, like a rolled metal shop door */}
      <div
        className="absolute inset-0 bg-brand-600"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 6px, transparent 6px, transparent 18px)',
        }}
      />
      <div className="relative flex flex-col items-center gap-3 pb-24 text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center font-black text-3xl">
          {storeName.charAt(0).toUpperCase()}
        </div>
        <p className="text-2xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{storeName}</p>
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Opening up...</p>
      </div>
    </div>
  );
}