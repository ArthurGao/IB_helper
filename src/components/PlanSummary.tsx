import { Printer, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Plan, Subject } from '../types/ib'
import type { PlanEvaluation } from '../hooks/usePlanEvaluation'
import { useLocalized } from '../hooks/useLocalized'
import { diplomaRules } from '../data'
import { StatusPill } from './StatusPill'

interface Props {
  plan: Plan
  evaluation: PlanEvaluation
  subjectsByCode: Map<string, Subject>
  onShare: () => void
  shareFeedback?: string
}

/** Step 5 一页式方案卡：打印样式见 index.css 的 @media print。 */
export function PlanSummary({ plan, evaluation, subjectsByCode, onShare, shareFeedback }: Props) {
  const { t } = useTranslation('selector')
  const { t: l } = useLocalized()
  const { diploma, ue, pathways, warnings, valid } = evaluation

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold text-ink">{t('step5.title')}</h2>
        <StatusPill tone={valid ? 'ok' : 'danger'}>
          {valid ? t('step3.valid') : t('step3.invalid')}
        </StatusPill>
        <StatusPill tone={ue.ueLiteracyNumeracy ? 'ok' : 'warn'}>
          {ue.ueLiteracyNumeracy ? t('step5.ueMet') : t('step5.ueNotMet')}
        </StatusPill>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {plan.subjects.map((pick) => {
          const subject = subjectsByCode.get(pick.code)
          return (
            <li key={pick.code} className="rounded-md border border-border px-3 py-2 text-sm">
              <span className="text-ink">{subject ? l(subject.name) : pick.code}</span>
              <span className="ml-2 text-xs font-medium text-ink-muted">{pick.level}</span>
            </li>
          )
        })}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        {(['safe', 'best'] as const).map((scenario) => (
          <p key={scenario} className="text-sm text-ink">
            {t(`step4.${scenario}`)}:{' '}
            <span className="font-semibold">
              {diploma[scenario].status === 'incomplete' ? '—' : (diploma[scenario].total ?? '—')} /{' '}
              {diploma[scenario].max}
            </span>{' '}
            <span className="text-ink-muted">
              (
              {t(`step4.status.${diploma[scenario].status}`, {
                passMark: diplomaRules.passMark,
                count: plan.subjects.length,
                required: diplomaRules.requiredSubjectCount,
              })}
              )
            </span>
          </p>
        ))}
      </div>

      <p className="text-sm text-ink-muted">
        TOK {plan.tok} · EE {plan.ee} · CAS {plan.casComplete ? '✓' : '✗'} ·{' '}
        {t('step5.warningCount', { count: warnings.length })} ·{' '}
        {t('step5.pathwayOpen', {
          open: pathways.filter((p) => p.status === 'meets').length,
          total: pathways.length,
        })}
      </p>

      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink"
        >
          <Printer aria-hidden="true" className="size-4" />
          {t('step5.print')}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink"
        >
          <Share2 aria-hidden="true" className="size-4" />
          {t('step5.share')}
        </button>
        {shareFeedback && <span className="self-center text-sm text-ok">{shareFeedback}</span>}
      </div>
    </article>
  )
}
