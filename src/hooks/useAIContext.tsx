import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { collectAITargets, getAIPageType, toAICartItem, type AIPageContext } from '../lib/aiContext';

type AIContextValue = {
  context: AIPageContext;
  getContext: (overrides?: Partial<AIPageContext>) => AIPageContext;
  setPageContext: (partial: Record<string, unknown>) => void;
  clearPageContext: () => void;
};

const AIContext = createContext<AIContextValue | null>(null);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { language, theme, experience, cart } = useStore();
  const [pageContext, setPageContextState] = useState<Record<string, unknown>>({});
  const pageKey = location.pathname + location.search;

  useEffect(() => {
    setPageContextState({});
  }, [pageKey]);

  const baseContext = useMemo<AIPageContext>(() => {
    const itemSnapshots = cart.map(toAICartItem);
    return {
      page: location.pathname,
      pageType: getAIPageType(location.pathname, location.search),
      query: location.search,
      pageTitle: document.title,
      language,
      theme,
      experience,
      cart: {
        items: itemSnapshots,
        itemCount: itemSnapshots.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: itemSnapshots.reduce((sum, item) => sum + item.line_total, 0),
      },
      pageMap: collectAITargets(),
      guidedMode: useStore.getState().guidedMode,
      guideStep: useStore.getState().guidedTask
        ? {
            index: useStore.getState().guidedStepIndex,
            target: useStore.getState().guidedTask?.steps[useStore.getState().guidedStepIndex]?.target || null,
            goal: useStore.getState().guidedTask?.goal || null,
          }
        : null,
    };
  }, [location.pathname, location.search, language, theme, experience, cart]);

  const contextRef = useRef(baseContext);
  contextRef.current = baseContext;

  const setPageContext = useCallback((partial: Record<string, unknown>) => {
    setPageContextState(partial);
  }, []);

  const clearPageContext = useCallback(() => setPageContextState({}), []);

  const getContext = useCallback((overrides: Partial<AIPageContext> = {}) => {
    const liveStore = useStore.getState();
    const items = liveStore.cart.map(toAICartItem);
    return {
      ...contextRef.current,
      ...pageContext,
      ...overrides,
      pageMap: collectAITargets(),
      language: liveStore.language,
      theme: liveStore.theme,
      experience: liveStore.experience,
      cart: {
        items,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
      },
      page: window.location.pathname,
      query: window.location.search,
      pageTitle: document.title,
      guidedMode: liveStore.guidedMode,
      guideStep: liveStore.guidedTask
        ? {
            index: liveStore.guidedStepIndex,
            target: liveStore.guidedTask.steps[liveStore.guidedStepIndex]?.target || null,
            goal: liveStore.guidedTask.goal || null,
          }
        : null,
    } as AIPageContext;
  }, [pageContext]);

  const value = useMemo(() => ({
    context: { ...baseContext, ...pageContext },
    getContext,
    setPageContext,
    clearPageContext,
  }), [baseContext, pageContext, getContext, setPageContext, clearPageContext]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAIContext() {
  const value = useContext(AIContext);
  if (!value) throw new Error('useAIContext must be used inside AIContextProvider');
  return value;
}

export function useAIPageContext(partial: Record<string, unknown>) {
  const { setPageContext, clearPageContext } = useAIContext();
  const serialized = JSON.stringify(partial);

  useEffect(() => {
    setPageContext(partial);
    return () => clearPageContext();
  }, [serialized, setPageContext, clearPageContext]);
}
