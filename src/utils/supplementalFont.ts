import { SUPPLEMENTAL_FONTS } from '../i18n/locales';

const injected = new Set<string>();

export function loadSupplementalFont(locale: string): string | null {
  const spec = SUPPLEMENTAL_FONTS[locale as keyof typeof SUPPLEMENTAL_FONTS];
  if (!spec) return null;

  if (!injected.has(spec.googleId)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${spec.googleId}&display=swap`;
    document.head.appendChild(link);
    injected.add(spec.googleId);
  }

  return spec.family;
}
