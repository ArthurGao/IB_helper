import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { curriculumUpdates, curriculumUpdatesFile, subjects } from '../data'
import { useLocalized } from '../hooks/useLocalized'
import { useSelectionStore } from '../store/selectionStore'
import { StatusPill, type Tone } from '../components/StatusPill'
import { examYearOf, syllabusFor, type SyllabusVerdict } from '../lib/curriculum'

const VERDICT_TONE: Record<SyllabusVerdict, Tone> = {
  new: 'ok',
  old: 'warn',
  unknown: 'neutral',
  'not-announced': 'neutral',
}

export default function Updates() {
  const { t } = useTranslation('updates')
  const { t: tc } = useTranslation()
  const { t: l } = useLocalized()
  const dpStartYear = useSelectionStore((s) => s.plan.dpStartYear)
  const setDpStartYear = useSelectionStore((s) => s.setDpStartYear)
  const examSession = useSelectionStore((s) => s.plan.examSession)
  const setExamSession = useSelectionStore((s) => s.setExamSession)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('lead')}</p>
      </header>

      <div className="flex flex-wrap gap-6">
        <label className="flex max-w-xs flex-col gap-1 text-sm text-ink">
          {t('dpStartYear')}
          <input
            type="number"
            min={2020}
            max={2035}
            value={dpStartYear ?? ''}
            onChange={(event) =>
              setDpStartYear(event.target.value ? Number(event.target.value) : undefined)
            }
            className="rounded-md border border-border bg-surface-raised px-3 py-2"
          />
        </label>

        {/* 5 月还是 11 月由用户选：差一年会把新旧大纲判反，不做推测。 */}
        <fieldset className="flex flex-col gap-1 text-sm text-ink">
          <legend className="mb-1">{t('session.label')}</legend>
          <div className="flex gap-2">
            {(['may', 'november'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={examSession === value}
                onClick={() => setExamSession(value)}
                className={`rounded-full border px-3 py-1.5 ${
                  examSession === value
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-border text-ink-muted'
                }`}
              >
                {t(`session.${value}`)}
              </button>
            ))}
          </div>
          <span className="max-w-xs text-xs leading-relaxed text-ink-muted">
            {t('session.hint')}
          </span>
        </fieldset>
      </div>

      {dpStartYear !== undefined && examSession !== undefined && (
        <p className="text-sm text-ink-muted">
          {t('examYear', {
            year: examYearOf(dpStartYear, examSession),
            session: t(`session.${examSession}`),
          })}
        </p>
      )}

      <ul className="grid gap-3 xl:grid-cols-2">
        {curriculumUpdates.map((update) => {
          const verdict = syllabusFor(dpStartYear, update.firstExams, examSession)
          return (
            <li key={update.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium text-ink">{l(update.name)}</h2>
                <StatusPill tone={VERDICT_TONE[verdict]}>{t(`verdict.${verdict}`)}</StatusPill>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l(update.note)}</p>
              <p className="mt-2 text-xs text-ink-muted">
                {t('firstTeaching')}: {update.firstTeaching ?? '—'} · {t('firstExams')}:{' '}
                {update.firstExams ?? '—'}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {update.subjectCodes
                  .map((code) => subjects.find((s) => s.code === code))
                  .filter((s) => s !== undefined)
                  .map((s) => l(s.name))
                  .join('、')}
              </p>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-ink-muted">
        {tc('data.lastVerified', { date: curriculumUpdatesFile.lastVerified })} ·{' '}
        <a
          className="inline-flex items-center gap-1 text-brand underline"
          href={curriculumUpdatesFile.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {tc('data.source')}
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
      </p>
    </section>
  )
}
