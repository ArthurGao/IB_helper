import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { newQualifications, reformTimelineFile } from '../data/ncea'
import { resolveQualificationByYear } from '../lib/ncea-rules'
import { useLocalized } from '../hooks/useLocalized'
import { useNceaStore } from '../store/nceaStore'
import { ReformNotice } from '../components/ReformNotice'
import { StatusPill, type Tone } from '../components/StatusPill'

const YEAR_LEVELS = [9, 10, 11, 12, 13]

const STATUS_TONE: Record<'confirmed' | 'proposed' | 'tbc', Tone> = {
  confirmed: 'ok',
  proposed: 'warn',
  tbc: 'neutral',
}

export default function NceaWhichOne() {
  const { t } = useTranslation('ncea')
  const { t: tc } = useTranslation()
  const { t: l } = useLocalized()

  const yearLevel = useNceaStore((s) => s.plan.yearLevel)
  const calendarYear = useNceaStore((s) => s.plan.calendarYear)
  const setYearLevel = useNceaStore((s) => s.setYearLevel)
  const setCalendarYear = useNceaStore((s) => s.setCalendarYear)

  const currentYear = calendarYear ?? new Date().getFullYear()

  const rows = useMemo(
    () => (yearLevel === undefined ? [] : resolveQualificationByYear(yearLevel, currentYear)),
    [yearLevel, currentYear],
  )

  const qualificationName = (id: string): string => {
    const found = newQualifications.find((q) => q.id === id)
    if (found) return l(found.name)
    if (id.startsWith('ncea-')) return `NCEA Level ${id.slice(-1)}`
    return t('whichOne.noQualification')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('whichOne.title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('whichOne.lead')}</p>
      </header>

      <ReformNotice />

      <div className="flex flex-wrap gap-4">
        <fieldset className="flex flex-col gap-2 text-sm text-ink">
          <legend className="mb-1">{t('whichOne.yearLevel')}</legend>
          <div className="flex flex-wrap gap-2">
            {YEAR_LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={yearLevel === value}
                onClick={() => setYearLevel(value)}
                className={`rounded-full border px-3 py-1.5 ${
                  yearLevel === value
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-border text-ink-muted'
                }`}
              >
                {t('whichOne.year', { year: value })}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex max-w-40 flex-col gap-1 text-sm text-ink">
          {t('whichOne.calendarYear')}
          <input
            type="number"
            min={2020}
            max={2040}
            value={currentYear}
            onChange={(event) => setCalendarYear(Number(event.target.value) || undefined)}
            className="rounded-md border border-border bg-surface-raised px-3 py-2"
          />
        </label>
      </div>

      {yearLevel === undefined ? (
        <p className="text-sm text-ink-muted">{t('whichOne.pickYearLevel')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.year}
              className="rounded-lg border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{row.year}</p>
                <p className="text-sm text-ink-muted">
                  {t('whichOne.year', { year: row.yearLevel })}
                </p>
                <StatusPill tone={STATUS_TONE[row.status]}>
                  {t('changes.status.' + row.status)}
                </StatusPill>
                <p className="ml-auto font-medium text-ink">
                  {qualificationName(row.qualification)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{l(row.note)}</p>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-ink-muted">
        {tc('data.lastVerified', { date: reformTimelineFile.lastVerified })} ·{' '}
        <a
          className="text-brand underline"
          href={reformTimelineFile.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {tc('data.source')}
        </a>
      </p>
    </section>
  )
}
