import { useTranslation } from 'react-i18next'
import type { Plan, SavedPlan } from '../types/ib'
import { subjects } from '../data'
import { useLocalized } from '../hooks/useLocalized'
import { useSelectionStore, MAX_COMPARE } from '../store/selectionStore'
import { checkNZUE, getWarnings, matchPathways, validateStructure, evaluateDiploma } from '../lib/ib-rules'
import { toSelection, warningsContextOf } from '../lib/plan'
import { StatusPill } from '../components/StatusPill'
import type { SubjectGrade } from '../types/ib'

const byCode = new Map(subjects.map((s) => [s.code, s]))

interface Row {
  plan: SavedPlan
  valid: boolean
  warnings: number
  ue: boolean
  openPathways: number
  totalPathways: number
  total: number | null
}

function summarize(plan: Plan): Omit<Row, 'plan'> {
  const selection = toSelection(plan)
  const structure = validateStructure(selection)
  const pathwayMatches = matchPathways(selection, plan.targetPathwayIds)
  const diploma = evaluateDiploma({
    grades: plan.subjects.map((pick) => ({
      code: pick.code,
      level: pick.level,
      grade: (plan.grades.safe[pick.code] ?? 4) as SubjectGrade,
    })),
    tok: plan.tok,
    ee: plan.ee,
    casComplete: plan.casComplete,
  })
  return {
    valid: structure.valid,
    warnings: getWarnings(selection, warningsContextOf(plan, structure.valid)).length,
    ue: checkNZUE(selection).ueLiteracyNumeracy,
    openPathways: pathwayMatches.filter((m) => m.status === 'meets').length,
    totalPathways: pathwayMatches.length,
    total: diploma.total,
  }
}

export default function Compare() {
  const { t } = useTranslation('compare')
  const { t: l } = useLocalized()
  const saved = useSelectionStore((s) => s.saved)
  const compareIds = useSelectionStore((s) => s.compareIds)
  const toggleCompare = useSelectionStore((s) => s.toggleCompare)
  const deletePlan = useSelectionStore((s) => s.deletePlan)

  const rows: Row[] = saved
    .filter((plan) => compareIds.includes(plan.id))
    .map((plan) => ({ plan, ...summarize(plan) }))

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">
          {t('lead', { max: MAX_COMPARE })}
        </p>
      </header>

      {saved.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2 print:hidden">
          {saved.map((plan) => (
            <li key={plan.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={compareIds.includes(plan.id)}
                onClick={() => toggleCompare(plan.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  compareIds.includes(plan.id)
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-border text-ink-muted'
                }`}
              >
                {plan.name}
              </button>
              <button
                type="button"
                onClick={() => deletePlan(plan.id)}
                className="rounded-full border border-border px-2 py-1.5 text-xs text-ink-muted"
                aria-label={`${t('delete')}: ${plan.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">{t('title')}</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-border p-2 text-left text-ink-muted">
                  {t('field')}
                </th>
                {rows.map((row) => (
                  <th key={row.plan.id} scope="col" className="border-b border-border p-2 text-left text-ink">
                    {row.plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="p-2 text-left align-top text-ink-muted">
                  {t('subjects')}
                </th>
                {rows.map((row) => (
                  <td key={row.plan.id} className="p-2 align-top text-ink">
                    <ul>
                      {row.plan.subjects.map((pick) => (
                        <li key={pick.code}>
                          {byCode.get(pick.code) ? l(byCode.get(pick.code)!.name) : pick.code}{' '}
                          <span className="text-xs text-ink-muted">{pick.level}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-2 text-left text-ink-muted">{t('valid')}</th>
                {rows.map((row) => (
                  <td key={row.plan.id} className="p-2">
                    <StatusPill tone={row.valid ? 'ok' : 'danger'}>
                      {row.valid ? t('yes') : t('no')}
                    </StatusPill>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-2 text-left text-ink-muted">{t('total')}</th>
                {rows.map((row) => (
                  <td key={row.plan.id} className="p-2 text-ink">{row.total ?? '—'} / 45</td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-2 text-left text-ink-muted">{t('ue')}</th>
                {rows.map((row) => (
                  <td key={row.plan.id} className="p-2">
                    <StatusPill tone={row.ue ? 'ok' : 'warn'}>
                      {row.ue ? t('yes') : t('no')}
                    </StatusPill>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-2 text-left text-ink-muted">{t('pathways')}</th>
                {rows.map((row) => (
                  <td key={row.plan.id} className="p-2 text-ink">
                    {row.openPathways}/{row.totalPathways}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-2 text-left text-ink-muted">{t('warnings')}</th>
                {rows.map((row) => (
                  <td key={row.plan.id} className="p-2 text-ink">{row.warnings}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
