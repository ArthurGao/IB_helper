import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setLanguage } from '../store/uiStore'
import { dataLangOf } from '../hooks/useLocalized'

/** 中 / EN 一键切换。选择由 i18next 存进 localStorage。 */
export function LangSwitch() {
  const { t, i18n } = useTranslation()
  const isZh = dataLangOf(i18n.language) === 'zh'

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border bg-surface-raised p-1"
      role="group"
      aria-label={t('language.label')}
    >
      <Languages aria-hidden="true" className="ml-1 size-4 text-ink-muted" />
      <button
        type="button"
        onClick={() => void setLanguage('zh-CN')}
        aria-pressed={isZh}
        className={`rounded-full px-3 py-1 text-sm ${
          isZh ? 'bg-brand text-brand-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {t('language.zh')}
      </button>
      <button
        type="button"
        onClick={() => void setLanguage('en')}
        aria-pressed={!isZh}
        className={`rounded-full px-3 py-1 text-sm ${
          !isZh ? 'bg-brand text-brand-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        {t('language.en')}
      </button>
    </div>
  )
}
