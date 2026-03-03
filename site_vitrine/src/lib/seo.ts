import { useEffect } from 'react';

function ensureMeta(name: string, attr: 'name' | 'property' = 'name'): HTMLMetaElement {
  const selector = `meta[${attr}="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const meta = document.createElement('meta');
  meta.setAttribute(attr, name);
  document.head.appendChild(meta);
  return meta;
}

export function usePageMeta(input: {
  title: string;
  description: string;
  path: string;
}): void {
  useEffect(() => {
    document.title = input.title;

    const description = ensureMeta('description');
    description.content = input.description;

    const ogTitle = ensureMeta('og:title', 'property');
    ogTitle.content = input.title;

    const ogDescription = ensureMeta('og:description', 'property');
    ogDescription.content = input.description;

    const canonicalHref = `https://footalert.romdev.cloud${input.path}`;
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalHref;
  }, [input.description, input.path, input.title]);
}
