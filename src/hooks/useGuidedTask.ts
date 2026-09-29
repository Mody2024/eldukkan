import { useMemo } from 'react';
import { useStore, type GuidedTask } from '../store';

export function useGuidedTask() {
  const task = useStore((state) => state.guidedTask);
  const mode = useStore((state) => state.guidedMode);
  const stepIndex = useStore((state) => state.guidedStepIndex);
  const next = useStore((state) => state.nextGuidedStep);
  const previous = useStore((state) => state.previousGuidedStep);
  const stop = useStore((state) => state.stopGuidedTask);
  const start = useStore((state) => state.startGuidedTask);

  const progress = useMemo(() => {
    if (!task || task.steps.length === 0) return 0;
    return Math.min(1, (stepIndex + 1) / task.steps.length);
  }, [task, stepIndex]);

  return {
    task,
    mode,
    stepIndex,
    progress,
    currentStep: task?.steps[stepIndex] ?? null,
    start: (nextTask: GuidedTask) => start(nextTask),
    next,
    previous,
    stop,
  };
}
