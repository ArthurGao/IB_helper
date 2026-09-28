import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { ueApprovedSubjects, ueRequirements, ueRequirementsFile } from '../data/ncea'
import { checkUniversityEntrance } from '../lib/ncea-rules'
import { useLocalized } from '../hooks/useLocalized'
import { useNceaStore } from '../store/nceaStore'
import { CreditInput } from '../components/ncea/CreditInput'
import { StatusPill } from '../components/StatusPill'

export default function NceaUniversity() {
  const { t } = useTranslation('ncea')
  const { t: tc } = useTranslation()
  const { t: l } = useLocalized()

  const plan = useNceaStore((s) => s.plan)
  const upsertSubject = useNceaStore((s) => s.upsertSubject)
  const removeSubject = useNceaStore((s) => s.removeSubject)
  const setLiteracyNumeracy = useNceaStore((s) => s.setLiteracyNumeracy)
  const setNceaLevel3Awarded = useNceaStore((s) => s.setNceaLevel3Awarded)

  const [picked, setPicked] = useState('')

  // 权威判定来自规则引擎，页面只负责展示与收集输入。
  const result = useMemo(() => checkUniversityEntrance(plan), [plan])
  const level3Subjects = plan.subjects.filter((s) => s.level === 3)
  const byCode = useMemo(
    () => new Map(ueApprovedSubjects.map((s) => [s.code, s])),
    [],
  )

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('university.title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('university.lead')}</p>
      </header>

      {/* 四项亮灯：任缺其一即未达 UE */}
      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-medium text-ink">{t('university.resultTitle')}</h2>
          <StatusPill tone={result.ueAwarded ? 'ok' : 'danger'}>
            {result.ueAwarded ? t('university.met') : t('university.notMet')}
          </StatusPill>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {result.components.map((component) => {
            const rule = ueRequirements.find((r) => r.id === component.id)
            return (
              <li key={component.id} className="flex items-start gap-2 text-sm">
                <StatusPill tone={component.met ? 'ok' : 'danger'}>
                  {component.met ? t('university.ok') : t('university.missing')}
                </StatusPill>
                <span className="min-w-0 flex-1">
                  <span className="text-ink">{rule ? l(rule.label) : component.id}</span>
                  <span className="block text-xs leading-relaxed text-ink-muted">
                    {rule ? l(rule.rule) : ''}
                  </span>
                  {!component.met && component.gap > 0 && (
                    <span className="mt-1 block text-xs text-danger">
                      {t('university.gap', { gap: component.gap })}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="font-medium text-ink">{t('university.level3Title')}</h2>
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={plan.nceaLevel3Awarded === true}
                onChange={(event) => setNceaLevel3Awarded(event.target.checked)}
              />
              {t('university.level3Checkbox')}
            </label>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="font-medium text-ink">{t('university.literacyTitle')}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <CreditInput
                label={t('university.reading')}
                value={plan.literacyNumeracy.readingCredits}
                onChange={(readingCredits) => setLiteracyNumeracy({ readingCredits })}
                hint={t('university.minCredits', { n: ueRequirementsFile.literacy.minReading })}
              />
              <CreditInput
                label={t('university.writing')}
                value={plan.literacyNumeracy.writingCredits}
                onChange={(writingCredits) => setLiteracyNumeracy({ writingCredits })}
                hint={t('university.minCredits', { n: ueRequirementsFile.literacy.minWriting })}
              />
              <CreditInput
                label={t('university.numeracy')}
                value={plan.literacyNumeracy.numeracyCredits}
                onChange={(numeracyCredits) => setLiteracyNumeracy({ numeracyCredits })}
                hint={t('university.minCredits', { n: ueRequirementsFile.numeracy.credits })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <h2 className="font-medium text-ink">{t('university.subjectsTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {t('university.subjectsHint', {
              count: ueRequirementsFile.approvedSubjectCount,
              credits: ueRequirementsFile.approvedSubjectCredits,
            })}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              aria-label={t('university.addSubject')}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">{t('university.addSubject')}</option>
              {ueApprovedSubjects
                .filter((s) => !level3Subjects.some((x) => x.subjectCode === s.code))
                .map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {l(subject.name)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!picked}
              onClick={() => {
                if (!picked) return
                upsertSubject({ subjectCode: picked, level: 3, credits: 0 })
                setPicked('')
              }}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink disabled:opacity-40"
            >
              {t('university.add')}
            </button>
          </div>

          <ul className="mt-3 flex flex-col gap-3">
            {level3Subjects.map((entry) => (
              <li key={entry.subjectCode} className="flex flex-wrap items-end gap-3">
                <span className="min-w-32 flex-1 text-sm text-ink">
                  {l(byCode.get(entry.subjectCode)?.name ?? { en: entry.subjectCode, zh: entry.subjectCode })}
                </span>
                <div className="w-28">
                  <CreditInput
                    label={t('university.l3Credits')}
                    value={entry.credits}
                    onChange={(credits) =>
                      upsertSubject({ ...entry, credits })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSubject(entry.subjectCode, 3)}
                  aria-label={`${t('university.remove')}: ${l(byCode.get(entry.subjectCode)?.name ?? { en: entry.subjectCode, zh: entry.subjectCode })}`}
                  className="rounded-md border border-border p-2 text-ink-muted"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
            {level3Subjects.length === 0 && (
              <li className="text-sm text-ink-muted">{t('university.noSubjects')}</li>
            )}
          </ul>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        {t('university.beyondUe')} ·{' '}
        {tc('data.lastVerified', { date: ueRequirementsFile.lastVerified })} ·{' '}
        <a
          className="text-brand underline"
          href={ueRequirementsFile.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {tc('data.source')}
        </a>
      </p>
    </section>
  )
}
