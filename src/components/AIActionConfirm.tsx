import { Check, X } from 'lucide-react';

type Props = {
  title: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AIActionConfirm({
  title,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 space-y-3" role="dialog" aria-label={title}>
      <p className="text-sm font-black dark:text-white">{title}</p>
      {details && <p className="text-xs text-stone-500">{details}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onConfirm} disabled={loading} className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-black disabled:opacity-50">
          <Check size={14} /> {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black dark:text-white disabled:opacity-50">
          <X size={14} /> {cancelLabel}
        </button>
      </div>
    </div>
  );
}
