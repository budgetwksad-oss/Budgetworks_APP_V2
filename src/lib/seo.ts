interface SEOOptions {
  title: string;
  description: string;
  canonicalPath: string;
  ogImagePath?: string;
}

function upsertMeta(selector: string, attribute: string, value: string): void {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const parts = selector.match(/\[(.+?)="(.+?)"\]/);
    if (parts) {
      el.setAttribute(parts[1], parts[2]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attribute, value);
}

function upsertLink(rel: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface FAQEntry {
  question: string;
  answer: string;
}

export function setFAQSchema(id: string, faqs: FAQEntry[]): () => void {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);

  return () => {
    const el = document.getElementById(id);
    if (el) el.remove();
  };
}

export function setSEO({ title, description, canonicalPath, ogImagePath }: SEOOptions): void {
  const origin = window.location.origin;
  const canonicalUrl = origin + canonicalPath;

  document.title = title;

  upsertMeta('meta[name="description"]', 'content', description);

  upsertMeta('meta[property="og:title"]', 'content', title);
  upsertMeta('meta[property="og:description"]', 'content', description);
  upsertMeta('meta[property="og:type"]', 'content', 'website');
  upsertMeta('meta[property="og:url"]', 'content', canonicalUrl);

  if (ogImagePath) {
    upsertMeta('meta[property="og:image"]', 'content', origin + ogImagePath);
  }

  upsertLink('canonical', canonicalUrl);
}
