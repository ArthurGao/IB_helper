import { useTranslation } from 'react-i18next'

const STAGES = ['y9', 'y10', 'y11', 'y12'] as const

/** 9→12 年级横向时间线（规格 4.1）。文案全部走 i18n。 */
export function Timeline() {
  const { t } = useTranslation('learn')
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((stage, index) => (
        <li key={stage} className="rounded-lg border border-border bg-surface-raised p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {index + 1} / {STAGES.length}
          </p>
          <h3 className="mt-1 font-medium text-ink">{t(`timeline.${stage}.title`)}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(`timeline.${stage}.body`)}</p>
        </li>
      ))}
    </ol>
  )
}
