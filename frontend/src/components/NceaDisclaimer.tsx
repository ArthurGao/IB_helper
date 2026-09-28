import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** NCEA 专用免责声明（与 IB 的 Disclaimer 并列，强调制度正在变）。 */
export function NceaDisclaimer() {
  const { t } = useTranslation('ncea')
  const { t: tc } = useTranslation()
  return (
    <aside
      className="rounded-lg border border-border bg-surface-raised p-4 text-sm text-ink-muted"
      aria-label={tc('disclaimer.title')}
    >
      <p className="flex items-center gap-2 font-medium text-ink">
        <Info aria-hidden="true" className="size-4" />
        {tc('disclaimer.title')}
      </p>
      <p className="mt-2 leading-relaxed">{t('disclaimer')}</p>
    </aside>
  )
}
