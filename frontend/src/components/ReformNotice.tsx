import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * NCEA 改革提示条。所有涉及改革内容的页面都要挂——官方尚未定稿，
 * 不提示就等于把「提案」当「事实」讲给家长（增量规格 §2 的红线）。
 */
export function ReformNotice() {
  const { t } = useTranslation('ncea')
  return (
    <p className="flex items-start gap-2 rounded-lg border border-warn/40 bg-surface-raised p-3 text-sm leading-relaxed text-ink">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
      {t('reformBanner')}
    </p>
  )
}
