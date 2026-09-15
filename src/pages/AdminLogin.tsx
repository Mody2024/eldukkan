import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      // Deliberately generic: never confirm whether the email exists or is an admin.
      setError('Invalid credentials.');
      setLoading(false);
      return;
    }
    // App.tsx's onAuthStateChange listener picks up the session and checks
    // admin_users automatically; ProtectedAdminRoute re-renders once that
    // resolves, so there's nothing else to do here.
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
            <Lock size={22} />
          </div>
          <h1 className="text-xl font-black dark:text-white">Restricted Area</h1>
          <p className="text-zinc-500 text-xs">Sign in with an authorized admin account.</p>
        </div>

        {error && (
          <p className="text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl text-center">{error}</p>
        )}

        <div className="space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-sm dark:text-white outline-none focus:border-amber-500"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-sm dark:text-white outline-none focus:border-amber-500"
          />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}