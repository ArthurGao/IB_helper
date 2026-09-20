import { useTranslation } from 'react-i18next'
import type { RuleMessage, Warning } from '../types/ib'
import { useLocalized } from '../hooks/useLocalized'
import { StatusPill, type Tone } from './StatusPill'

const SEVERITY_TONE: Record<Warning['severity'], Tone> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
}

interface Props {
  errors: RuleMessage[]
  warnings: Warning[]
}

/** 合法性错误（i18n key）+ 数据驱动警告（JSON 双语文案）。 */
export function WarningsPanel({ errors, warnings }: Props) {
  const { t } = useTranslation('selector')
  const { t: l } = useLocalized()

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <StatusPill tone="ok">{t('step3.allClear')}</StatusPill>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
      {errors.length > 0 && (
        <div>
          <h3 className="mb-2 font-medium text-ink">{t('step3.errorsTitle')}</h3>
          <ul className="flex flex-col gap-2">
            {errors.map((error) => (
              <li key={`${error.id}-${JSON.stringify(error.params ?? {})}`} className="flex items-start gap-2 text-sm">
                <StatusPill tone="danger">{t('step3.invalid')}</StatusPill>
                <span className="min-w-0 flex-1 text-ink">{t(`errors.${error.id}`, { ...error.params })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <h3 className="mb-2 font-medium text-ink">{t('step3.warningsTitle')}</h3>
          <ul className="flex flex-col gap-2">
            {warnings.map((warning) => (
              <li key={warning.id} className="flex items-start gap-2 text-sm">
                <StatusPill tone={SEVERITY_TONE[warning.severity]}>
                  {t(`severity.${warning.severity}`)}
                </StatusPill>
                <span className="min-w-0 flex-1 text-ink">{l(warning.msg)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
