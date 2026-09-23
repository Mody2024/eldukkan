import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string | null;
  type?: 'website' | 'product';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  robots?: string;
}

const SITE_URL = 'https://eldukkan.vercel.app';
const DEFAULT_IMAGE = '/favicon.svg';

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export default function SEO({ title, description, canonical, image, type = 'website', jsonLd, robots = 'index, follow, max-image-preview:large' }: SEOProps) {
  useEffect(() => {
    const absoluteImage = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}${DEFAULT_IMAGE}`;
    const absoluteCanonical = canonical
      ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`)
      : window.location.href.split('?')[0];

    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, robots);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, type);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, absoluteCanonical);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, absoluteImage);
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'ElDukkan');
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, absoluteImage);
    upsertLink('canonical', absoluteCanonical);

    const old = document.head.querySelectorAll('script[data-eldukkan-jsonld]');
    old.forEach((node) => node.remove());

    if (jsonLd) {
      const scripts = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      scripts.forEach((schema) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.eldukkanJsonld = 'true';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.head.querySelectorAll('script[data-eldukkan-jsonld]').forEach((node) => node.remove());
    };
  }, [title, description, canonical, image, type, jsonLd, robots]);

  return null;
}

export { SITE_URL };
