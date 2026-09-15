import { Navigate } from 'react-router-dom';
import { useStore } from '../store';
import AdminLogin from '../pages/AdminLogin';
import AdminDashboard from '../pages/AdminDashboard';

/**
 * Gate for the admin dashboard.
 *
 * Security note: the route this renders under is an unguessable path (see
 * App.tsx / VITE_ADMIN_PATH) and there is no visible link to it anywhere in
 * the UI, so it won't show up to casual visitors. But path secrecy alone is
 * NOT real security — the value is inlined into the built JS bundle and can
 * be found by anyone who inspects it. The actual access control lives here
 * (Supabase Auth session) and in Postgres Row Level Security (see the SQL
 * migration) which restricts what an authenticated-but-non-admin session,
 * or the public anon key, can read or write. Don't remove either layer.
 */
export default function ProtectedAdminRoute() {
  const { userEmail, isAuthorizedAdmin, adminCheckPending } = useStore();

  // Wait for the async admin_users lookup to actually finish before
  // deciding anything — otherwise a real admin gets bounced during the
  // moment their session is known but their admin status isn't yet.
  if (userEmail && adminCheckPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm font-bold">
        Checking access...
      </div>
    );
  }

  if (!userEmail) return <AdminLogin />;
  if (!isAuthorizedAdmin) return <Navigate to="/" replace />;
  return <AdminDashboard />;
}