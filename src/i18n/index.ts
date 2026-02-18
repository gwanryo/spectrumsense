import type { Locale } from '../types'
import en from './en.json'
import ko from './ko.json'
import ja from './ja.json'

type TranslationMap = Record<string, string>

const translations: Record<Locale, TranslationMap> = { en, ko, ja }

let _currentLocale: Locale = 'en'

/**
 * Detect locale from URL param (?lang=XX) then browser, then fallback to 'en'.
 * Priority: URL param > navigator.language > 'en'
 */
export function detectLocale(): Locale {
  // 1. Check hash param #/...?lang=
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex !== -1) {
    const hashParams = new URLSearchParams(hash.slice(queryIndex))
    const langParam = hashParams.get('lang')
    if (langParam && isValidLocale(langParam)) {
      return langParam as Locale
    }
  }

  // 2. Check browser language
  const browserLang = navigator.language?.split('-')[0]
  if (browserLang && isValidLocale(browserLang)) {
    return browserLang as Locale
  }

  // 3. Fallback
  return 'en'
}

function isValidLocale(lang: string): lang is Locale {
  return ['en', 'ko', 'ja'].includes(lang)
}

/** Set the active locale */
export function setLocale(locale: Locale): void {
  _currentLocale = locale
}

/** Get the current active locale */
export function getCurrentLocale(): Locale {
  return _currentLocale
}

/**
 * Translate a key. Returns the key itself as fallback if missing.
 * Supports simple {placeholder} substitution.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const map = translations[_currentLocale] ?? translations.en
  let str = map[key] ?? key

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v))
    }
  }

  return str
}

/** Initialize i18n: detect locale and set it */
export function initI18n(): Locale {
  const locale = detectLocale()
  setLocale(locale)
  return locale
}
