import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import yaml from 'js-yaml';
import { canvasLocaleSchema, getTranslation } from '../schemas/canvasLocale';
import { i18nKey } from '../utils/i18nKey';
import { useAppTranslations } from '../context/AppTranslationsContext';
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

async function fetchCanvasLocale(
  locale: string,
  dataVersion: string,
  allPermissions: Record<string, PermissionRef>,
): Promise<Record<string, string>> {
  const url = `https://raw.githubusercontent.com/instructure/canvas-lms/stable/${dataVersion}/config/locales/${locale}.yml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const raw = yaml.load(text);
  if (!isRecord(raw)) throw new Error('YAML did not parse to an object');
  const localeKey = Object.keys(raw)[0];
  const result = canvasLocaleSchema(localeKey).parse(raw);
  return buildLocaleLabels(localeKey, result, allPermissions);
}

export function useLocale(
  locale: string,
  allPermissions: Record<string, PermissionRef>,
  dataVersion: string,
): UseLocaleResult {
  const { t } = useAppTranslations();
  const englishLabels = useMemo(() => buildEnglishLabels(allPermissions), [allPermissions]);

  const { data, isPlaceholderData, isError, error } = useQuery({
    queryKey: ['canvasLocale', locale, dataVersion],
    queryFn: () => fetchCanvasLocale(locale, dataVersion, allPermissions),
    enabled: locale !== 'en',
    placeholderData: (previousData) => previousData ?? englishLabels,
  });

  useEffect(() => {
    if (!isError) return;
    const localeName = isLocaleNameKey(locale) ? LOCALE_NAMES[locale] : locale;
    notifications.show({
      color: 'red',
      title: t('error.localeLoadFailed'),
      message: t('error.localeLoadFailedMessage', { locale: localeName }),
    });
  }, [isError, error, locale, t]);

  if (locale === 'en') return { localeLabels: englishLabels, isLoading: false };

  return {
    localeLabels: data ?? englishLabels,
    isLoading: isPlaceholderData,
  };
}
