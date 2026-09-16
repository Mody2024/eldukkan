import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { User } from 'lucide-react';

export default function CustomerLogin() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const showToast = useStore((s) => s.showToast);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'signup') {
      showToast('Account created! Check your email to confirm, then sign in.');
      setMode('signin');
      return;
    }

    showToast('Signed in.');
    navigate('/account');
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` },
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
            <User size={22} />
          </div>
          <h1 className="text-xl font-black dark:text-white">
            {mode === 'signin' ? 'Sign In' : 'Create an Account'}
          </h1>
          <p className="text-zinc-500 text-xs">
            {mode === 'signin' ? 'Track your orders and check out faster.' : 'Save your details for faster checkout.'}
          </p>
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
            minLength={6}
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
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase">or</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-3.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-sm dark:text-white flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
          className="w-full text-center text-xs font-bold text-zinc-500 hover:text-amber-500 transition"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}