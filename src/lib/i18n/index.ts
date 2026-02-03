// i18n exports - client-safe (no server-only imports)
export {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
  isValidLocale,
  type Locale,
} from './config';
export { I18nProvider, useI18n, useTranslation, useLocale, useLocaleSwitch } from './context';

// Re-export Dictionary type (type-only is safe for client)
export type { Dictionary } from './dictionaries';
