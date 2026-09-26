import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  BrainCircuit, CheckCircle2, Clock3, Coins, EyeOff, Play, RefreshCw,
  Save, Search, ShieldCheck, Sparkles, UserCog, Zap,
} from 'lucide-react';

interface Props {
  userEmail: string | null;
  showToast: (message: string) => void;
}

interface GlobalSettings {
  id: boolean;
  enabled: boolean;
  guest_enabled: boolean;
  unlimited: boolean;
  renewal_credits: number;
  renewal_interval_minutes: number;
  message_cost: number;
  search_cost: number;
  action_cost: number;
  max_balance: number;
  carry_over: boolean;
  safe_mode: boolean;
  require_confirmation: boolean;
  action_permissions: Record<string, boolean>;
}

interface UserSettings {
  user_id: string;
  email: string;
  daily_credits_override: number | null;
  message_cost_override: number | null;
  search_cost_override: number | null;
  action_cost_override: number | null;
  renewal_interval_minutes_override: number | null;
  max_balance_override: number | null;
  carry_over_override: boolean | null;
  unlimited_override: boolean | null;
  ai_disabled: boolean;
  memory_enabled: boolean;
  safe_mode_override: boolean | null;
  require_confirmation_override: boolean | null;
}

interface Wallet {
  user_id: string;
  email: string;
  balance: number;
  next_renewal_at: string;
  last_seen_at: string;
}

interface ActivityRow {
  id: string;
  user_id: string | null;
  identifier: string;
  event_type: string;
  credits_charged: number;
  success: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTIONS = [
  ['search_products', 'Search catalog'],
  ['add_to_cart', 'Add to cart'],
  ['change_theme', 'Change theme'],
  ['apply_coupon', 'Apply coupon'],
  ['open_checkout', 'Open checkout'],
  ['start_guided_mode', 'Start guided mode'],
  ['submit_order', 'Submit order'],
  ['cancel_order', 'Cancel order'],
] as const;

const NUMERIC_OVERRIDES: { key: 'daily_credits_override' | 'message_cost_override' | 'renewal_interval_minutes_override' | 'max_balance_override'; label: string }[] = [
  { key: 'daily_credits_override', label: 'Renewal credits' },
  { key: 'message_cost_override', label: 'Message cost' },
  { key: 'renewal_interval_minutes_override', label: 'Renew every (min)' },
  { key: 'max_balance_override', label: 'Max balance' },
];

const emptySettings: GlobalSettings = {
  id: true,
  enabled: true,
  guest_enabled: true,
  unlimited: false,
  renewal_credits: 100,
  renewal_interval_minutes: 1440,
  message_cost: 2,
  search_cost: 0,
  action_cost: 0,
  max_balance: 100,
  carry_over: false,
  safe_mode: true,
  require_confirmation: true,
  action_permissions: {
    search_products: true,
    add_to_cart: true,
    change_theme: true,
    apply_coupon: true,
    open_checkout: true,
    start_guided_mode: true,
    submit_order: false,
    cancel_order: false,
  },
};

function formatInterval(minutes: number) {
  if (minutes % 1440 === 0) return (minutes / 1440) + ' day' + (minutes === 1440 ? '' : 's');
  if (minutes % 60 === 0) return (minutes / 60) + ' hour' + (minutes === 60 ? '' : 's');
  return minutes + ' min';
}

function formatCredits(value: number, unlimited = false) {
  return unlimited ? 'Unlimited' : value.toLocaleString('en-EG');
}

export default function AIControlCenter({ userEmail, showToast }: Props) {
  const [settings, setSettings] = useState<GlobalSettings>(emptySettings);
  const [userSettings, setUserSettings] = useState<UserSettings[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<UserSettings | null>(null);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('10');
  const [playgroundPrompt, setPlaygroundPrompt] = useState('Find the best headphones under EGP 200');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<{
    reply: string;
    products?: { id: string; name: string; price: number; sale_price: number | null }[];
    toolTrace?: { tool: string; input?: Record<string, unknown>; resultCount?: number }[];
    estimatedCost?: number;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    const [settingsResult, usersResult, walletsResult, activityResult] = await Promise.all([
      supabase.from('ai_credit_settings').select('*').eq('id', true).single(),
      supabase.from('ai_user_settings').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('ai_user_wallets').select('*').order('last_seen_at', { ascending: false }).limit(500),
      supabase.from('ai_activity_log').select('*').order('created_at', { ascending: false }).limit(500),
    ]);

    if (settingsResult.data) {
      setSettings({
        ...emptySettings,
        ...settingsResult.data,
        action_permissions: {
          ...emptySettings.action_permissions,
          ...(settingsResult.data.action_permissions || {}),
        },
      });
    }
    if (usersResult.data) setUserSettings(usersResult.data as UserSettings[]);
    if (walletsResult.data) setWallets(walletsResult.data as Wallet[]);
    if (activityResult.data) setActivity(activityResult.data as ActivityRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const userRows = useMemo(() => {
    const walletMap = new Map(wallets.map((wallet) => [wallet.user_id, wallet]));
    return userSettings
      .map((user) => ({ ...user, wallet: walletMap.get(user.user_id) }))
      .filter((user) => !userSearch.trim() || user.email.toLowerCase().includes(userSearch.trim().toLowerCase()));
  }, [userSettings, wallets, userSearch]);

  const analytics = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const day = activity.filter((row) => new Date(row.created_at).getTime() >= dayAgo);
    const week = activity.filter((row) => new Date(row.created_at).getTime() >= weekAgo);
    const activeUsers = new Set(week.map((row) => row.user_id).filter(Boolean)).size;
    const memoryUsers = userSettings.filter((row) => row.memory_enabled && !row.ai_disabled).length;
    return {
      requestsToday: day.length,
      requests7d: week.length,
      credits7d: week.reduce((sum, row) => sum + Number(row.credits_charged || 0), 0),
      failures7d: week.filter((row) => !row.success).length,
      activeUsers,
      memoryUsers,
    };
  }, [activity, userSettings]);

  const saveGlobal = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = { ...settings, updated_by: userData.user?.id ?? null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('ai_credit_settings').upsert(payload, { onConflict: 'id' });
    if (error) showToast('Could not save AI settings: ' + error.message);
    else {
      await supabase.from('admin_activity_log').insert([{ admin_email: userEmail, action: 'update_ai_global_settings', details: payload }]);
      showToast('AI control settings saved.');
    }
    setSaving(false);
  };

  const editUser = (user: UserSettings) => {
    setEditingUserId(user.user_id);
    setEditDraft({ ...user });
  };

  const saveUser = async () => {
    if (!editDraft) return;
    const { error } = await supabase.from('ai_user_settings').upsert({
      ...editDraft,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) {
      showToast('Could not save user AI settings: ' + error.message);
      return;
    }
    await supabase.from('admin_activity_log').insert([{
      admin_email: userEmail,
      action: 'update_ai_user_settings',
      details: { user_id: editDraft.user_id, email: editDraft.email },
    }]);
    showToast('User AI settings saved.');
    setEditingUserId(null);
    setEditDraft(null);
    await load();
  };

  const adjustCredits = async (userId: string) => {
    const delta = Number(adjustAmount);
    if (!Number.isFinite(delta) || delta === 0) {
      showToast('Enter a non-zero credit adjustment.');
      return;
    }
    const { error } = await supabase.rpc('ai_admin_adjust_credits', {
      p_user_id: userId,
      p_delta: Math.trunc(delta),
      p_reason: 'Admin wallet adjustment',
    });
    if (error) {
      showToast('Could not adjust credits: ' + error.message);
      return;
    }
    await supabase.from('admin_activity_log').insert([{
      admin_email: userEmail,
      action: 'adjust_ai_credits',
      details: { user_id: userId, delta: Math.trunc(delta) },
    }]);
    showToast('AI credits updated.');
    setAdjustUserId(null);
    await load();
  };

  const runPlayground = async () => {
    if (!playgroundPrompt.trim() || playgroundLoading) return;
    setPlaygroundLoading(true);
    setPlaygroundResult(null);
    const { data, error } = await supabase.functions.invoke('shop-assistant', {
      body: { mode: 'playground', message: playgroundPrompt.trim(), history: [], identifier: 'admin-playground' },
    });
    if (error) {
      showToast('Playground request failed.');
      setPlaygroundLoading(false);
      return;
    }
    setPlaygroundResult(data);
    setPlaygroundLoading(false);
  };

  const inputClass = 'w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-brand-500 outline-none font-bold dark:text-white';
  const cardClass = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl';
  const softClass = 'bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800';

  return (
    <section className="space-y-6">
      <div className={cardClass + ' p-5 sm:p-6'}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0"><BrainCircuit size={21} /></div>
            <div>
              <h2 className="text-xl font-black dark:text-white">AI Control Center</h2>
              <p className="text-xs text-stone-500 mt-1">Credits, memory, permissions, usage and safe actions all in one place.</p>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black dark:text-white"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['AI status', settings.enabled ? 'Live' : 'Paused', settings.enabled ? 'text-emerald-500' : 'text-red-500'],
          ['Requests / 24h', analytics.requestsToday, 'text-brand-500'],
          ['Requests / 7d', analytics.requests7d, 'text-brand-500'],
          ['Credits used / 7d', analytics.credits7d, 'text-brand-500'],
          ['Active users / 7d', analytics.activeUsers, 'text-brand-500'],
          ['Memory enabled', analytics.memoryUsers, 'text-brand-500'],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className={cardClass + ' p-4'}>
            <p className="text-[10px] uppercase font-black tracking-wider text-stone-400">{label}</p>
            <p className={'text-xl font-black mt-1 ' + tone}>{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-6">
        <div className={cardClass + ' p-5 sm:p-6 space-y-5'}>
          <div className="flex items-center gap-3"><Coins size={19} className="text-brand-500" /><div><h3 className="font-black text-lg dark:text-white">Credit engine</h3><p className="text-xs text-stone-500">Global defaults for the live AI wallet.</p></div></div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Renewal credits</span><input type="number" min="0" value={settings.renewal_credits} onChange={(e) => setSettings({ ...settings, renewal_credits: Math.max(0, Number(e.target.value) || 0) })} className={inputClass} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Renew every (minutes)</span><input type="number" min="5" max="43200" value={settings.renewal_interval_minutes} onChange={(e) => setSettings({ ...settings, renewal_interval_minutes: Math.min(43200, Math.max(5, Number(e.target.value) || 5)) })} className={inputClass} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Message cost</span><input type="number" min="0" value={settings.message_cost} onChange={(e) => setSettings({ ...settings, message_cost: Math.max(0, Number(e.target.value) || 0) })} className={inputClass} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Max balance</span><input type="number" min="0" value={settings.max_balance} onChange={(e) => setSettings({ ...settings, max_balance: Math.max(0, Number(e.target.value) || 0) })} className={inputClass} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Search cost</span><input type="number" min="0" value={settings.search_cost} onChange={(e) => setSettings({ ...settings, search_cost: Math.max(0, Number(e.target.value) || 0) })} className={inputClass} /></label>
            <label className="space-y-2"><span className="text-[11px] font-black text-stone-500">Action cost</span><input type="number" min="0" value={settings.action_cost} onChange={(e) => setSettings({ ...settings, action_cost: Math.max(0, Number(e.target.value) || 0) })} className={inputClass} /></label>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              ['enabled', 'Enable AI assistant', settings.enabled],
              ['guest_enabled', 'Allow guest AI', settings.guest_enabled],
              ['unlimited', 'Unlimited global credits', settings.unlimited],
              ['carry_over', 'Carry unused credits', settings.carry_over],
              ['safe_mode', 'AI Safe Mode', settings.safe_mode],
              ['require_confirmation', 'Confirm AI actions', settings.require_confirmation],
            ].map(([key, label, checked]) => (
              <label key={String(key)} className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 cursor-pointer">
                <input type="checkbox" checked={Boolean(checked)} onChange={(e) => setSettings({ ...settings, [key as 'enabled' | 'guest_enabled' | 'unlimited' | 'carry_over' | 'safe_mode' | 'require_confirmation']: e.target.checked })} className="w-4 h-4 accent-brand-500" />
                <span className="text-xs font-black text-stone-700 dark:text-stone-200">{label}</span>
              </label>
            ))}
          </div>

          <div className={softClass + ' rounded-2xl p-4'}>
            <div className="flex items-center justify-between gap-4 mb-3"><div><p className="font-black dark:text-white">Renewal preview</p><p className="text-xs text-stone-500 mt-1">{formatCredits(settings.renewal_credits, settings.unlimited)} credits every {formatInterval(settings.renewal_interval_minutes)} · max {formatCredits(settings.max_balance)}</p></div><Clock3 size={18} className="text-brand-500" /></div>
            <button disabled={saving} onClick={saveGlobal} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500 text-white text-sm font-black disabled:opacity-50"><Save size={15} /> {saving ? 'Saving...' : 'Save global AI controls'}</button>
          </div>
        </div>

        <div className={cardClass + ' p-5 sm:p-6'}>
          <div className="flex items-center gap-3 mb-4"><ShieldCheck size={19} className="text-emerald-500" /><div><h3 className="font-black text-lg dark:text-white">Action permissions</h3><p className="text-xs text-stone-500">The matrix is ready for guided actions as they are introduced.</p></div></div>
          <div className="space-y-2.5">
            {ACTIONS.map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <span className="text-sm font-black text-stone-700 dark:text-stone-200">{label}</span>
                <input type="checkbox" checked={settings.action_permissions[key] !== false} disabled={key === 'submit_order' || key === 'cancel_order'} onChange={(e) => setSettings({ ...settings, action_permissions: { ...settings.action_permissions, [key]: e.target.checked } })} className="w-5 h-5 accent-brand-500" />
              </label>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 text-xs text-stone-600 dark:text-stone-300">
            <b>Safety rule:</b> order submission and cancellation stay disabled at the AI tool level. Irreversible checkout actions remain customer-controlled.
          </div>
        </div>
      </div>

      <div className={cardClass + ' p-5 sm:p-6'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div><h3 className="font-black text-lg dark:text-white">Per-user AI controls</h3><p className="text-xs text-stone-500 mt-1">Known signed-in AI users. Blank override fields inherit global rules.</p></div>
          <div className="relative w-full sm:w-72"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search user email..." className={inputClass + ' pl-9'} /></div>
        </div>

        {loading ? <p className="py-10 text-center text-stone-500 text-sm">Loading AI users...</p> : (
          <div className="space-y-2.5">
            {userRows.map((user) => (
              <div key={user.user_id} className={softClass + ' rounded-2xl p-4'}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0"><UserCog size={18} /></div>
                    <div className="min-w-0"><p className="font-black truncate dark:text-white">{user.email}</p><p className="text-[11px] text-stone-500">{user.wallet ? formatCredits(user.wallet.balance) + ' credits' : 'No wallet yet'} · {user.memory_enabled ? 'memory on' : 'memory off'}{user.ai_disabled ? ' · AI disabled' : ''}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.wallet && <span className="text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">{new Date(user.wallet.next_renewal_at).toLocaleString()}</span>}
                    <button onClick={() => editUser(user)} className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-black dark:text-white">Edit</button>
                    {user.wallet && <button onClick={() => setAdjustUserId(user.user_id)} className="px-3 py-2 rounded-xl bg-brand-500 text-white text-xs font-black">Adjust credits</button>}
                  </div>
                </div>

                {editingUserId === user.user_id && editDraft && (
                  <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {NUMERIC_OVERRIDES.map(({ key, label }) => (
                        <label key={key} className="space-y-2"><span className="text-[11px] font-black text-stone-500">{label}</span><input type="number" min={key === 'renewal_interval_minutes_override' ? 5 : 0} value={editDraft[key] == null ? '' : String(editDraft[key])} placeholder="Global" onChange={(e) => setEditDraft({ ...editDraft, [key]: e.target.value === '' ? null : Number(e.target.value) })} className={inputClass} /></label>
                      ))}
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <label className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-950"><input type="checkbox" checked={editDraft.ai_disabled} onChange={(e) => setEditDraft({ ...editDraft, ai_disabled: e.target.checked })} className="accent-brand-500" /><span className="text-xs font-black dark:text-white">Disable AI</span></label>
                      <label className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-950"><input type="checkbox" checked={editDraft.memory_enabled} onChange={(e) => setEditDraft({ ...editDraft, memory_enabled: e.target.checked })} className="accent-brand-500" /><span className="text-xs font-black dark:text-white">Memory enabled</span></label>
                      <label className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-950"><input type="checkbox" checked={editDraft.unlimited_override === true} onChange={(e) => setEditDraft({ ...editDraft, unlimited_override: e.target.checked ? true : null })} className="accent-brand-500" /><span className="text-xs font-black dark:text-white">Unlimited override</span></label>
                      <label className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-950"><input type="checkbox" checked={editDraft.carry_over_override === true} onChange={(e) => setEditDraft({ ...editDraft, carry_over_override: e.target.checked ? true : null })} className="accent-brand-500" /><span className="text-xs font-black dark:text-white">Carry-over override</span></label>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <select value={editDraft.safe_mode_override == null ? 'global' : String(editDraft.safe_mode_override)} onChange={(e) => setEditDraft({ ...editDraft, safe_mode_override: e.target.value === 'global' ? null : e.target.value === 'true' })} className={inputClass}><option value="global">Safe Mode: Global</option><option value="true">Safe Mode: On</option><option value="false">Safe Mode: Off</option></select>
                      <select value={editDraft.require_confirmation_override == null ? 'global' : String(editDraft.require_confirmation_override)} onChange={(e) => setEditDraft({ ...editDraft, require_confirmation_override: e.target.value === 'global' ? null : e.target.value === 'true' })} className={inputClass}><option value="global">Confirmation: Global</option><option value="true">Always confirm actions</option><option value="false">No action confirmation</option></select>
                    </div>
                    <div className="flex gap-2"><button onClick={saveUser} className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-black text-xs">Save user controls</button><button onClick={() => { setEditingUserId(null); setEditDraft(null); }} className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-xs dark:text-white">Cancel</button></div>
                  </div>
                )}

                {adjustUserId === user.user_id && (
                  <div className="mt-3 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 flex flex-col sm:flex-row gap-2">
                    <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="e.g. 20 or -10" className={inputClass} />
                    <button onClick={() => adjustCredits(user.user_id)} className="px-4 py-3 rounded-xl bg-brand-500 text-white font-black text-xs">Apply</button>
                    <button onClick={() => setAdjustUserId(null)} className="px-4 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-xs dark:text-white">Cancel</button>
                  </div>
                )}
              </div>
            ))}
            {!userRows.length && <div className="py-12 text-center text-stone-500 text-sm">No signed-in AI users have been recorded yet.</div>}
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className={cardClass + ' p-5 sm:p-6'}>
          <div className="flex items-center gap-3 mb-4"><Sparkles size={19} className="text-brand-500" /><div><h3 className="font-black text-lg dark:text-white">AI Playground</h3><p className="text-xs text-stone-500">Test the assistant against the live catalog without charging customer credits or saving customer memory.</p></div></div>
          <textarea value={playgroundPrompt} onChange={(e) => setPlaygroundPrompt(e.target.value)} className={inputClass + ' min-h-28 resize-y'} />
          <button onClick={runPlayground} disabled={playgroundLoading} className="mt-3 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500 text-white font-black text-xs disabled:opacity-50"><Play size={14} /> {playgroundLoading ? 'Testing...' : 'Run test'}</button>
          {playgroundResult && (
            <div className={softClass + ' rounded-2xl p-4 mt-4 space-y-3'}>
              <div><p className="text-[10px] uppercase font-black text-stone-400">Reply</p><p className="text-sm font-semibold mt-1 dark:text-white">{playgroundResult.reply}</p></div>
              <div><p className="text-[10px] uppercase font-black text-stone-400">Estimated credit cost</p><p className="font-black text-brand-500 mt-1">{playgroundResult.estimatedCost ?? 0}</p></div>
              {playgroundResult.toolTrace?.map((trace, index) => <div key={index} className="flex items-center gap-2 text-xs text-stone-500"><CheckCircle2 size={14} className="text-emerald-500" />{trace.tool}{typeof trace.resultCount === 'number' ? ' · ' + trace.resultCount + ' result(s)' : ''}</div>)}
              {playgroundResult.products?.length ? <div className="space-y-1.5">{playgroundResult.products.map((p) => <div key={p.id} className="flex justify-between text-xs font-bold dark:text-white"><span className="truncate pr-3">{p.name}</span><span className="text-brand-500">EGP {p.sale_price ?? p.price}</span></div>)}</div> : null}
            </div>
          )}
        </div>

        <div className={cardClass + ' p-5 sm:p-6'}>
          <div className="flex items-center gap-3 mb-4"><Zap size={19} className="text-brand-500" /><div><h3 className="font-black text-lg dark:text-white">AI activity</h3><p className="text-xs text-stone-500">Operational telemetry without storing raw customer prompts.</p></div></div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activity.slice(0, 30).map((row) => <div key={row.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800"><div className={row.success ? 'text-emerald-500 mt-0.5' : 'text-red-500 mt-0.5'}>{row.success ? <CheckCircle2 size={14} /> : <EyeOff size={14} />}</div><div className="min-w-0 flex-1"><p className="text-xs font-black dark:text-white">{row.event_type.replaceAll('_', ' ')} <span className="text-brand-500">· {row.credits_charged} credits</span></p><p className="text-[10px] text-stone-500 mt-1 truncate">{row.user_id ? 'Signed-in user' : 'Guest'} · {new Date(row.created_at).toLocaleString()}</p></div></div>)}
            {!activity.length && <p className="py-10 text-center text-stone-500 text-sm">No AI activity recorded yet.</p>}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs text-stone-500">
        <b className="text-stone-700 dark:text-stone-300">Privacy:</b> persistent memory is customer-controlled and limited to shopping preferences plus bounded recent context. Admin metrics show memory status and usage, not private memory contents.
      </div>
    </section>
  );
}
