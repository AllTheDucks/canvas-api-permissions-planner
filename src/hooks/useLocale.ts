import { useState, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import yaml from 'js-yaml';
import { canvasLocaleSchema, getTranslation } from '../schemas/canvasLocale';
import { i18nKey } from '../utils/i18nKey';
import { LOCALE_NAMES } from '../i18n/locales';
import type { PermissionRef } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocaleNameKey(key: string): key is keyof typeof LOCALE_NAMES {
  return key in LOCALE_NAMES;
}

type UseLocaleResult = {
  localeLabels: Record<string, string>;
  isLoading: boolean;
};

const cache = new Map<string, Record<string, string>>();

function buildEnglishLabels(allPermissions: Record<string, PermissionRef>): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const [symbol, ref] of Object.entries(allPermissions)) {
    labels[symbol] = ref.label;
  }
  return labels;
}

function buildLocaleLabels(
  localeCode: string,
  parsed: Record<string, Record<string, unknown>>,
  allPermissions: Record<string, PermissionRef>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const [symbol, ref] of Object.entries(allPermissions)) {
    const key = i18nKey(ref.label);
    const translated = getTranslation(parsed, localeCode, key);
    labels[symbol] = translated ?? ref.label;
  }
  return labels;
}

export function useLocale(
  locale: string,
  allPermissions: Record<string, PermissionRef>,
  dataVersion: string,
): UseLocaleResult {
  const englishLabels = useRef(buildEnglishLabels(allPermissions));
  const [localeLabels, setLocaleLabels] = useState<Record<string, string>>(() => {
    if (locale === 'en') return englishLabels.current;
    return cache.get(locale) ?? englishLabels.current;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (locale === 'en') {
      setLocaleLabels(englishLabels.current);
      setIsLoading(false);
      return;
    }

    const cached = cache.get(locale);
    if (cached) {
      setLocaleLabels(cached);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const url = `https://raw.githubusercontent.com/instructure/canvas-lms/stable/${dataVersion}/config/locales/${locale}.yml`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const raw = yaml.load(text);
        if (!isRecord(raw)) throw new Error('YAML did not parse to an object');
        const localeKey = Object.keys(raw)[0];
        const result = canvasLocaleSchema(localeKey).parse(raw);
        const labels = buildLocaleLabels(localeKey, result, allPermissions);
        cache.set(locale, labels);
        setLocaleLabels(labels);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setIsLoading(false);
        setLocaleLabels(englishLabels.current);
        const localeName = isLocaleNameKey(locale) ? LOCALE_NAMES[locale] : locale;
        notifications.show({
          color: 'red',
          title: 'Locale load failed',
          message: `Could not load ${localeName} labels — showing in English`,
        });
      });

    return () => controller.abort();
  }, [locale, allPermissions, dataVersion]);

  return { localeLabels, isLoading };
}
