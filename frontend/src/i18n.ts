import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enCompare from './locales/en/compare.json'
import enGlossary from './locales/en/glossary.json'
import enNcea from './locales/en/ncea.json'
import enAi from './locales/en/ai.json'
import enUpdates from './locales/en/updates.json'
import enLearn from './locales/en/learn.json'
import enNz from './locales/en/nz.json'
import enSelector from './locales/en/selector.json'
import zhCommon from './locales/zh/common.json'
import zhCompare from './locales/zh/compare.json'
import zhGlossary from './locales/zh/glossary.json'
import zhNcea from './locales/zh/ncea.json'
import zhAi from './locales/zh/ai.json'
import zhUpdates from './locales/zh/updates.json'
import zhLearn from './locales/zh/learn.json'
import zhNz from './locales/zh/nz.json'
import zhSelector from './locales/zh/selector.json'

export const LANGUAGE_STORAGE_KEY = 'ib-selector.lang'
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en'] as const

export const resources = {
  en: {
    common: enCommon,
    compare: enCompare,
    learn: enLearn,
    selector: enSelector,
    nz: enNz,
    glossary: enGlossary,
    updates: enUpdates,
    ncea: enNcea,
    ai: enAi,
  },
  'zh-CN': {
    common: zhCommon,
    compare: zhCompare,
    learn: zhLearn,
    selector: zhSelector,
    nz: zhNz,
    glossary: zhGlossary,
    updates: zhUpdates,
    ncea: zhNcea,
    ai: zhAi,
  },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // zh / zh-TW / zh-HK 等都回落到 zh-CN，不要退到英文。
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    ns: ['common', 'learn', 'selector', 'compare', 'nz', 'glossary', 'updates', 'ncea', 'ai'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
