import { useCallback, useEffect, useState } from 'react';

const DONE_KEY = 'eldukkan-onboarding-completed-v3';

function getLocalVersion() {
  try {
    return Number(localStorage.getItem(DONE_KEY) || 0);
  } catch {
    return 0;
  }
}

export function useOnboarding(requiredVersion = 3) {
  const [completed, setCompleted] = useState(() => getLocalVersion() >= requiredVersion);

  const reopen = useCallback(() => {
    try { localStorage.removeItem(DONE_KEY); } catch {}
    window.dispatchEvent(new Event('eldukkan:replay-onboarding'));
    setCompleted(false);
  }, []);

  const markComplete = useCallback(() => {
    try { localStorage.setItem(DONE_KEY, String(requiredVersion)); } catch {}
    setCompleted(true);
    window.dispatchEvent(new Event('eldukkan:onboarding-complete'));
  }, [requiredVersion]);

  useEffect(() => {
    const sync = () => setCompleted(getLocalVersion() >= requiredVersion);
    window.addEventListener('storage', sync);
    window.addEventListener('eldukkan:onboarding-complete', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('eldukkan:onboarding-complete', sync);
    };
  }, [requiredVersion]);

  return { completed, reopen, markComplete };
}
