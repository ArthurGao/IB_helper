import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { L10n, Lang } from '../types/ib'

/** 当前界面语言映射到数据文件里的 `en` / `zh` 字段。 */
export function dataLangOf(i18nLanguage: string): Lang {
  return i18nLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/**
 * 数据文案的取值 helper：`t(subject.name)`。
 * UI 文案走 react-i18next，数据文案走这里——两者都不允许硬编码。
 */
export function useLocalized(): { t: (value: L10n) => string; lang: Lang } {
  const { i18n } = useTranslation()
  const lang = dataLangOf(i18n.language)
  const t = useCallback((value: L10n) => value[lang] ?? value.en, [lang])
  return { t, lang }
}
