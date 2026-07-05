import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'

const LANGUAGES_RAW = [
  { code: 'en', label: 'English', dir: 'ltr' },
]

/* ── Language detection ─────────────────────────────────────────
   Priority: saved preference > browser language > English fallback.
   The browser's navigator.language / navigator.languages list is
   matched against our supported codes (first 2 chars, case-insensitive).
   If the browser reports "ko-KR" or "ko", we match it to "ko". ── */
const SUPPORTED = new Set(LANGUAGES_RAW.map((l) => l.code))

function detectLanguage(): string {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fl-lang') : null
  if (saved && SUPPORTED.has(saved)) return saved

  if (typeof navigator !== 'undefined') {
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const tag of candidates) {
      const code = tag.split('-')[0].toLowerCase()
      if (SUPPORTED.has(code)) return code
    }
  }
  return 'en'
}

const detected = detectLanguage()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: detected,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export const LANGUAGES = LANGUAGES_RAW

export function changeLanguage(code: string) {
  i18n.changeLanguage(code)
  localStorage.setItem('fl-lang', code)
  document.documentElement.dir = LANGUAGES.find((l) => l.code === code)?.dir || 'ltr'
  document.documentElement.lang = code
}

export default i18n
