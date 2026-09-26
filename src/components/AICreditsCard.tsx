import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Coins, RefreshCw } from 'lucide-react';

interface Props { userId: string; }

interface Status {
  unlimited: boolean;
  balance: number;
  nextRenewalAt: string;
  renewalCredits: number;
  renewalIntervalMinutes: number;
  messageCost: number;
}

interface LedgerRow {
  id: string;
  delta: number;
  balance_after: number;
  event_type: string;
  reason: string | null;
  created_at: string;
}

function formatRemaining(nextRenewalAt: string, now: number) {
  const diff = Math.max(0, new Date(nextRenewalAt).getTime() - now);
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours + 'h ' + minutes + 'm';
}

export default function AICreditsCard({ userId }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [statusResult, ledgerResult] = await Promise.all([
      supabase.functions.invoke('shop-assistant', { body: { mode: 'status' } }),
      supabase.from('ai_credit_ledger').select('id,delta,balance_after,event_type,reason,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
    ]);
    if (!statusResult.error && statusResult.data) setStatus(statusResult.data as Status);
    if (ledgerResult.data) setLedger(ledgerResult.data as LedgerRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [userId]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Coins size={19} /></div>
          <div>
            <h2 className="text-lg font-black dark:text-white">AI Credits</h2>
            <p className="text-xs text-stone-500 mt-1">Your current assistant balance and recent credit activity.</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 disabled:opacity-50" title="Refresh credits"><RefreshCw size={15} /></button>
      </div>

      {loading && !status ? <p className="py-6 text-sm text-stone-500">Loading AI credits...</p> : status ? (
        <>
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10">
              <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Available</p>
              <p className="text-2xl font-black text-brand-500 mt-1">{status.unlimited ? '∞' : status.balance}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Renews</p>
              <p className="text-lg font-black dark:text-white mt-1">{status.unlimited ? 'Unlimited' : formatRemaining(status.nextRenewalAt, now)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
              <p className="text-[10px] uppercase font-black tracking-wide text-stone-400">Message cost</p>
              <p className="text-lg font-black dark:text-white mt-1">{status.messageCost} credit{status.messageCost === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] uppercase font-black tracking-wide text-stone-400 mb-2">Recent activity</p>
            <div className="space-y-2">
              {ledger.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                  <div className="min-w-0"><p className="text-xs font-black dark:text-white">{(row.reason || row.event_type).replaceAll('_', ' ')}</p><p className="text-[10px] text-stone-400 mt-0.5">{new Date(row.created_at).toLocaleString()}</p></div>
                  <div className="text-right shrink-0"><p className={'text-xs font-black ' + (row.delta >= 0 ? 'text-emerald-500' : 'text-red-500')}>{row.delta >= 0 ? '+' : ''}{row.delta}</p><p className="text-[10px] text-stone-400">{row.balance_after} left</p></div>
                </div>
              ))}
              {!ledger.length && <p className="text-xs text-stone-400 py-4">No credit activity yet.</p>}
            </div>
          </div>
        </>
      ) : <p className="py-6 text-sm text-stone-500">AI credit status is unavailable.</p>}
    </section>
  );
}
