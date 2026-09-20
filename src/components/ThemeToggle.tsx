import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { resolveTheme, useUiStore } from '../store/uiStore'

/** 深 / 浅色切换。图标 + aria-label，不只靠颜色表达状态。 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const isDark = resolveTheme(theme) === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`${t('theme.label')}: ${isDark ? t('theme.dark') : t('theme.light')}`}
      aria-pressed={isDark}
      className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm text-ink-muted hover:text-ink"
    >
      {isDark ? <Moon aria-hidden="true" className="size-4" /> : <Sun aria-hidden="true" className="size-4" />}
      <span className="hidden sm:inline">{isDark ? t('theme.dark') : t('theme.light')}</span>
    </button>
  )
}
