import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import es from './es.json'
import zh from './zh.json'
import hi from './hi.json'
import ar from './ar.json'
import pt from './pt.json'
import bn from './bn.json'
import ru from './ru.json'
import ja from './ja.json'
import pa from './pa.json'
import de from './de.json'
import ko from './ko.json'
import fr from './fr.json'
import tr from './tr.json'
import vi from './vi.json'
import it from './it.json'
import th from './th.json'
import id from './id.json'
import ms from './ms.json'
import nl from './nl.json'
import pl from './pl.json'
import ur from './ur.json'

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fl-lang') : null

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    zh: { translation: zh },
    hi: { translation: hi },
    ar: { translation: ar },
    pt: { translation: pt },
    bn: { translation: bn },
    ru: { translation: ru },
    ja: { translation: ja },
    pa: { translation: pa },
    de: { translation: de },
    ko: { translation: ko },
    fr: { translation: fr },
    tr: { translation: tr },
    vi: { translation: vi },
    it: { translation: it },
    th: { translation: th },
    id: { translation: id },
    ms: { translation: ms },
    nl: { translation: nl },
    pl: { translation: pl },
    ur: { translation: ur },
  },
  lng: saved || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'zh', label: '中文', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
  { code: 'bn', label: 'বাংলা', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ja', label: '日本語', dir: 'ltr' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'ko', label: '한국어', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe', dir: 'ltr' },
  { code: 'vi', label: 'Tiếng Việt', dir: 'ltr' },
  { code: 'it', label: 'Italiano', dir: 'ltr' },
  { code: 'th', label: 'ไทย', dir: 'ltr' },
  { code: 'id', label: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', label: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'nl', label: 'Nederlands', dir: 'ltr' },
  { code: 'pl', label: 'Polski', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
]

export function changeLanguage(code: string) {
  i18n.changeLanguage(code)
  localStorage.setItem('fl-lang', code)
  document.documentElement.dir = LANGUAGES.find((l) => l.code === code)?.dir || 'ltr'
  document.documentElement.lang = code
}

export default i18n
