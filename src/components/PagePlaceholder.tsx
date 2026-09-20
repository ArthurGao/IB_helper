import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  lead: string
  children?: ReactNode
}

/** M1 阶段的页面骨架：标题 + 导语 + 「后续里程碑完成」说明。 */
export function PagePlaceholder({ title, lead, children }: Props) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="max-w-2xl leading-relaxed text-ink-muted">{lead}</p>
      {children}
      <p className="text-sm text-ink-muted">{t('status.comingSoon')}</p>
    </section>
  )
}
