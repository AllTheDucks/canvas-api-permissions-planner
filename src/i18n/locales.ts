export const SUPPORTED_LOCALES = [
  'en',
  'ar', 'cs', 'cy', 'da', 'de', 'el', 'es', 'es-ES', 'fa', 'fi', 'fr',
  'he', 'hr', 'hu', 'hy', 'ja', 'ko', 'mi', 'nb', 'nl', 'pl', 'pt', 'pt-BR',
  'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant',
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const RTL_LOCALES = ['ar', 'fa', 'he'] as const;

export const LOCALE_NAMES = {
  en:        'English',
  ar:        'العربية',
  cs:        'Čeština',
  cy:        'Cymraeg',
  da:        'Dansk',
  de:        'Deutsch',
  el:        'Ελληνικά',
  es:        'Español',
  'es-ES':   'Español (España)',
  fa:        'فارسی',
  fi:        'Suomi',
  fr:        'Français',
  he:        'עברית',
  hr:        'Hrvatski',
  hu:        'Magyar',
  hy:        'Հայերեն',
  ja:        '日本語',
  ko:        '한국어',
  mi:        'Te Reo Māori',
  nb:        'Norsk Bokmål',
  nl:        'Nederlands',
  pl:        'Polski',
  pt:        'Português',
  'pt-BR':   'Português (Brasil)',
  ro:        'Română',
  ru:        'Русский',
  sk:        'Slovenčina',
  sl:        'Slovenščina',
  sv:        'Svenska',
  th:        'ภาษาไทย',
  tr:        'Türkçe',
  uk:        'Українська',
  vi:        'Tiếng Việt',
  'zh-Hans': '中文 (简体)',
  'zh-Hant': '中文 (繁體)',
} as const satisfies Record<SupportedLocale, string>;

export const SUPPLEMENTAL_FONTS = {
  ar:        { family: 'Noto Sans Arabic', googleId: 'Noto+Sans+Arabic:wght@400;500;700' },
  fa:        { family: 'Noto Sans Arabic', googleId: 'Noto+Sans+Arabic:wght@400;500;700' },
  he:        { family: 'Noto Sans Hebrew', googleId: 'Noto+Sans+Hebrew:wght@400;500;700' },
  hy:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' },
  el:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' },
  ru:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' },
  uk:        { family: 'Noto Sans',        googleId: 'Noto+Sans:wght@400;500;700' },
  ja:        { family: 'Noto Sans JP',     googleId: 'Noto+Sans+JP:wght@400;500;700' },
  ko:        { family: 'Noto Sans KR',     googleId: 'Noto+Sans+KR:wght@400;500;700' },
  th:        { family: 'Noto Sans Thai',   googleId: 'Noto+Sans+Thai:wght@400;500;700' },
  'zh-Hans': { family: 'Noto Sans SC',     googleId: 'Noto+Sans+SC:wght@400;500;700' },
  'zh-Hant': { family: 'Noto Sans TC',     googleId: 'Noto+Sans+TC:wght@400;500;700' },
} as const satisfies Partial<Record<SupportedLocale, { family: string; googleId: string }>>;
