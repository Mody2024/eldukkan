import type { ReactNode } from 'react';
import { Headset } from 'lucide-react';

export type AIEntryPointDetail = {
  prompt?: string;
  source?: string;
  mode?: 'chat' | 'guided' | 'task';
};

type Props = {
  label: string;
  prompt?: string;
  source?: string;
  mode?: AIEntryPointDetail['mode'];
  icon?: ReactNode;
  className?: string;
  title?: string;
};

export default function AIEntryPoint({
  label,
  prompt,
  source = 'storefront',
  mode = 'chat',
  icon = <Headset size={16} />,
  className = '',
  title,
}: Props) {
  const open = () => {
    window.dispatchEvent(new CustomEvent<AIEntryPointDetail>('eldukkan:open-ai', {
      detail: { prompt, source, mode },
    }));
  };

  return (
    <button
      type="button"
      data-ai-target="ai-entry"
      onClick={open}
      title={title}
      aria-label={label}
      className={
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/8 px-4 py-2.5 text-sm font-black text-brand-700 transition hover:border-brand-500/40 hover:bg-brand-500/12 dark:text-brand-300 ' +
        className
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
