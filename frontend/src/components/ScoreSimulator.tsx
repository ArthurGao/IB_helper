import { useTranslation } from 'react-i18next'
import type { CoreGrade, DiplomaResult, Plan, Scenario, Subject, SubjectGrade } from '../types/ib'
import { useLocalized } from '../hooks/useLocalized'
import { StatusPill, type Tone } from './StatusPill'
import { displayTotal } from '../lib/evaluatePlan'

const CORE_GRADES: CoreGrade[] = ['A', 'B', 'C', 'D', 'E', 'N']
const SUBJECT_GRADES: SubjectGrade[] = [1, 2, 3, 4, 5, 6, 7, 'N']

/** incomplete 有两种原因：没选满、或组合不合法——文案不同。 */
function statusKey(result: DiplomaResult): string {
  if (result.status === 'incomplete' && result.incompleteReason === 'structure') {
    return 'step4.status.incomplete-structure'
  }
  return `step4.status.${result.status}`
}

const STATUS_TONE: Record<DiplomaResult['status'], Tone> = {
  pass: 'ok',
  fail: 'danger',
  indeterminate: 'neutral',
  incomplete: 'warn',
}

interface Props {
  plan: Plan
  subjectsByCode: Map<string, Subject>
  results: Record<Scenario, DiplomaResult>
  passMark: number
  requiredSubjectCount: number
  onGrade: (scenario: Scenario, code: string, grade: SubjectGrade) => void
  onTok: (grade: CoreGrade) => void
  onEe: (grade: CoreGrade) => void
  onCas: (value: boolean) => void
}

function TotalCard({
  scenario,
  result,
  passMark,
  subjectCount,
  requiredSubjectCount,
}: {
  scenario: Scenario
  result: DiplomaResult
  passMark: number
  subjectCount: number
  requiredSubjectCount: number
}) {
  const { t } = useTranslation('selector')
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {t(`step4.${scenario}`)}
      </p>
      {/* 没选满 6 门或结构非法时不显示总分：那个数字看起来像文凭分数，其实不是。 */}
      <p className="mt-1 text-2xl font-semibold text-ink">
        {displayTotal(result) ?? '—'}{' '}
        <span className="text-base text-ink-muted">/ {result.max}</span>
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {t('step4.breakdown', {
          subjects: result.subjectPoints ?? '—',
          core: result.coreBonus ?? '—',
        })}
      </p>
      <div className="mt-2">
        <StatusPill tone={STATUS_TONE[result.status]}>
          {t(statusKey(result), {
            passMark,
            count: subjectCount,
            required: requiredSubjectCount,
          })}
        </StatusPill>
      </div>
    </div>
  )
}

/** Step 4 分数模拟器：滑块预估分 + TOK/EE + CAS，逐条失败条件亮灯。 */
export function ScoreSimulator({
  plan,
  subjectsByCode,
  results,
  passMark,
  requiredSubjectCount,
  onGrade,
  onTok,
  onEe,
  onCas,
}: Props) {
  const { t } = useTranslation('selector')
  const { t: l } = useLocalized()

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TotalCard
          scenario="safe"
          result={results.safe}
          passMark={passMark}
          subjectCount={plan.subjects.length}
          requiredSubjectCount={requiredSubjectCount}
        />
        <TotalCard
          scenario="best"
          result={results.best}
          passMark={passMark}
          subjectCount={plan.subjects.length}
          requiredSubjectCount={requiredSubjectCount}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h3 className="mb-3 font-medium text-ink">{t('step4.gradesTitle')}</h3>
        <ul className="flex flex-col gap-3">
          {plan.subjects.map((pick) => {
            const subject = subjectsByCode.get(pick.code)
            if (!subject) return null
            return (
              <li
                key={pick.code}
                className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3 sm:border-0 sm:pb-0"
              >
                <span className="flex-1 text-sm text-ink">
                  {l(subject.name)} <span className="text-ink-muted">({pick.level})</span>
                </span>
                <div className="flex gap-3">
                {(['safe', 'best'] as const).map((scenario) => (
                  <label key={scenario} className="flex items-center gap-2 text-xs text-ink-muted">
                    {t(`step4.${scenario}`)}
                    <select
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
                      value={String(plan.grades[scenario][pick.code] ?? '')}
                      onChange={(event) => {
                        const raw = event.target.value
                        onGrade(scenario, pick.code, raw === 'N' ? 'N' : (Number(raw) as SubjectGrade))
                      }}
                    >
                      <option value="">—</option>
                      {SUBJECT_GRADES.map((grade) => (
                        <option key={String(grade)} value={String(grade)}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            TOK
            <select
              className="rounded-md border border-border bg-surface px-2 py-1"
              value={plan.tok}
              onChange={(event) => onTok(event.target.value as CoreGrade)}
            >
              {CORE_GRADES.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            EE
            <select
              className="rounded-md border border-border bg-surface px-2 py-1"
              value={plan.ee}
              onChange={(event) => onEe(event.target.value as CoreGrade)}
            >
              {CORE_GRADES.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={plan.casComplete}
              onChange={(event) => onCas(event.target.checked)}
            />
            {t('step4.cas')}
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h3 className="mb-3 font-medium text-ink">{t('step4.conditionsTitle')}</h3>
        <ul className="flex flex-col gap-2">
          {results.safe.conditions.map((condition) => (
            <li key={condition.id} className="flex items-start gap-2 text-sm">
              <StatusPill
                tone={
                  condition.status === 'passed'
                    ? 'ok'
                    : condition.status === 'failed'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {t(`step4.condition.${condition.status}`)}
              </StatusPill>
              <span className="min-w-0 flex-1 text-ink">{l(condition.msg)}</span>
            </li>
          ))}
        </ul>
        {results.safe.unverified.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t('diploma.indeterminate')}</p>
        )}
      </div>
    </div>
  )
}
