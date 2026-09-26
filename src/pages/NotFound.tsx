import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    const robots = document.head.querySelector('meta[name="robots"]');
    robots?.setAttribute('content', 'noindex, follow');

    return () => {
      robots?.setAttribute('content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    };
  }, []);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-stone-50 dark:bg-stone-950">
      <section className="w-full max-w-xl storefront-card p-8 sm:p-10 text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-stone-400">404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black text-stone-900 dark:text-stone-50">Page not found</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-300">The page you opened does not exist or has moved.</p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center justify-center rounded-2xl bg-stone-900 px-6 py-3 font-extrabold text-white transition hover:opacity-90 dark:bg-white dark:text-stone-900"
        >
          Back to ElDukkan
        </Link>
      </section>
    </main>
  );
}
