import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** 规格第 15 节的常驻免责声明（双语走 i18n）。 */
export function Disclaimer() {
  const { t } = useTranslation()
  return (
    <aside
      className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-ink-muted"
      aria-label={t('disclaimer.title')}
    >
      <p className="flex items-center gap-2 font-medium text-ink">
        <Info aria-hidden="true" className="size-4" />
        {t('disclaimer.title')}
      </p>
      <p className="mt-2 leading-relaxed">{t('disclaimer.body')}</p>
    </aside>
  )
}
