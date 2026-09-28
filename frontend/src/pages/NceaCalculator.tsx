import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { NceaLevel } from '../types/ncea'
import { nceaLevels, ueApprovedSubjects } from '../data/ncea'
import { calcNceaLevel } from '../lib/ncea-rules'
import { useLocalized } from '../hooks/useLocalized'
import { useNceaStore } from '../store/nceaStore'
import { CreditInput } from '../components/ncea/CreditInput'
import { StatusPill } from '../components/StatusPill'

const LEVELS: NceaLevel[] = [1, 2, 3]

export default function NceaCalculator() {
  const { t } = useTranslation('ncea')
  const { t: l } = useLocalized()
  const plan = useNceaStore((s) => s.plan)
  const upsertSubject = useNceaStore((s) => s.upsertSubject)
  const removeSubject = useNceaStore((s) => s.removeSubject)
  const setLiteracyNumeracy = useNceaStore((s) => s.setLiteracyNumeracy)

  const [level, setLevel] = useState<NceaLevel>(2)
  const [name, setName] = useState('')

  const result = useMemo(() => calcNceaLevel(plan, level), [plan, level])
  const info = nceaLevels.find((x) => x.level === level)!
  const entries = plan.subjects.filter((s) => s.level === level)
  const subjectName = (code: string) =>
    l(ueApprovedSubjects.find((s) => s.code === code)?.name ?? { en: code, zh: code })

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('calculator.title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('calculator.lead')}</p>
        <p className="text-xs leading-relaxed text-warn">{t('calculator.estimateOnly')}</p>
      </header>

      <nav aria-label={t('calculator.levelTabs')}>
        <ul className="flex flex-wrap gap-2">
          {LEVELS.map((value) => (
            <li key={value}>
              <button
                type="button"
                aria-pressed={level === value}
                onClick={() => setLevel(value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  level === value
                    ? 'border-brand bg-brand text-brand-ink'
                    : 'border-border text-ink-muted hover:text-ink'
                }`}
              >
                {l(nceaLevels.find((x) => x.level === value)!.name)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-medium text-ink">{t('calculator.resultTitle')}</h2>
            <StatusPill tone={result.awarded ? 'ok' : 'warn'}>
              {result.awarded ? t('calculator.awarded') : t('calculator.notYet')}
            </StatusPill>
          </div>

          <p className="mt-3 text-2xl font-semibold text-ink">
            {result.creditsCounted}
            <span className="ml-1 text-sm font-normal text-ink-muted">
              / {result.creditsRequired} {t('howItWorks.credits')}
            </span>
          </p>

          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-2">
              <StatusPill tone={result.creditsMet ? 'ok' : 'warn'}>
                {result.creditsMet ? t('university.ok') : t('university.missing')}
              </StatusPill>
              <span className="min-w-0 flex-1 text-ink">
                {t('calculator.creditsRow', { required: result.creditsRequired })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <StatusPill tone={result.coRequisiteMet ? 'ok' : 'warn'}>
                {result.coRequisiteMet ? t('university.ok') : t('university.missing')}
              </StatusPill>
              <span className="min-w-0 flex-1 text-ink">
                {t('calculator.coRequisiteRow', {
                  literacy: info.coRequisite.literacy,
                  numeracy: info.coRequisite.numeracy,
                })}
              </span>
            </li>
          </ul>

          <div className="mt-4 border-t border-border pt-3">
            <p className="text-sm text-ink">
              {t('calculator.certificateEndorsement')}:{' '}
              <span className="font-medium">
                {t('calculator.endorsement.' + result.certificateEndorsement)}
              </span>
            </p>
            <p className="mt-1 text-sm text-ink">
              {t('calculator.subjectEndorsements')}:{' '}
              <span className="font-medium">
                {result.subjectEndorsements.length > 0
                  ? result.subjectEndorsements.map(subjectName).join('、')
                  : t('calculator.endorsement.none')}
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              {t('calculator.endorsementHint')}
            </p>
          </div>

          <div className="mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <CreditInput
              label={t('university.reading')}
              value={plan.literacyNumeracy.readingCredits}
              onChange={(readingCredits) => setLiteracyNumeracy({ readingCredits })}
            />
            <CreditInput
              label={t('university.writing')}
              value={plan.literacyNumeracy.writingCredits}
              onChange={(writingCredits) => setLiteracyNumeracy({ writingCredits })}
            />
            <CreditInput
              label={t('university.numeracy')}
              value={plan.literacyNumeracy.numeracyCredits}
              onChange={(numeracyCredits) => setLiteracyNumeracy({ numeracyCredits })}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <h2 className="font-medium text-ink">{t('calculator.subjectsTitle')}</h2>

          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const code = name.trim()
              if (!code) return
              upsertSubject({ subjectCode: code, level, credits: 0 })
              setName('')
            }}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('calculator.subjectPlaceholder')}
              aria-label={t('calculator.subjectPlaceholder')}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
              list="ncea-subject-suggestions"
            />
            <datalist id="ncea-subject-suggestions">
              {ueApprovedSubjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {l(s.name)}
                </option>
              ))}
            </datalist>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink"
            >
              {t('university.add')}
            </button>
          </form>

          <ul className="mt-3 flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.subjectCode} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="mr-auto text-sm font-medium text-ink">
                    {subjectName(entry.subjectCode)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubject(entry.subjectCode, level)}
                    aria-label={`${t('university.remove')}: ${subjectName(entry.subjectCode)}`}
                    className="rounded-md border border-border p-2 text-ink-muted"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <CreditInput
                    label={t('calculator.credits')}
                    value={entry.credits}
                    onChange={(credits) => upsertSubject({ ...entry, credits })}
                  />
                  <CreditInput
                    label={t('calculator.meritCredits')}
                    value={entry.meritOrExcellenceCredits ?? 0}
                    onChange={(meritOrExcellenceCredits) =>
                      upsertSubject({ ...entry, meritOrExcellenceCredits })
                    }
                  />
                  <CreditInput
                    label={t('calculator.internalCredits')}
                    value={entry.internalCredits ?? 0}
                    onChange={(internalCredits) => upsertSubject({ ...entry, internalCredits })}
                  />
                  <CreditInput
                    label={t('calculator.externalCredits')}
                    value={entry.externalCredits ?? 0}
                    onChange={(externalCredits) => upsertSubject({ ...entry, externalCredits })}
                  />
                </div>
              </li>
            ))}
            {entries.length === 0 && (
              <li className="text-sm text-ink-muted">{t('calculator.noSubjects')}</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}
