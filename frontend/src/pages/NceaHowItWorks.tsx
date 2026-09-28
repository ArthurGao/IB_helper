import { useTranslation } from 'react-i18next'
import { nceaLevels, nceaLevelsFile } from '../data/ncea'
import { useLocalized } from '../hooks/useLocalized'
import { StatusPill } from '../components/StatusPill'

const GRADES = ['notAchieved', 'achieved', 'merit', 'excellence'] as const

export default function NceaHowItWorks() {
  const { t } = useTranslation('ncea')
  const { t: tc } = useTranslation()
  const { t: l } = useLocalized()

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('howItWorks.title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('howItWorks.lead')}</p>
      </header>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('howItWorks.levelsTitle')}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {nceaLevels.map((level) => (
            <li key={level.level} className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {t('howItWorks.typicalYear', { year: level.typicalYear })}
              </p>
              <h3 className="mt-1 font-medium text-ink">{l(level.name)}</h3>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {level.creditsAtLevel}
                <span className="ml-1 text-sm font-normal text-ink-muted">
                  {t('howItWorks.credits')}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l(level.summary)}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* co-requisite 是最容易被误解的一点：不计入 60 学分，且一次修得、各级通用。 */}
      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium text-ink">{t('howItWorks.coRequisiteTitle')}</h2>
          <StatusPill tone="warn">{t('howItWorks.coRequisiteBadge')}</StatusPill>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {l(nceaLevels[0]!.coRequisite.note)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('howItWorks.gradesTitle')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GRADES.map((grade) => (
            <li key={grade} className="rounded-lg border border-border bg-surface-raised p-4">
              <p className="font-medium text-ink">{t('howItWorks.grades.' + grade + '.label')}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {t('howItWorks.grades.' + grade + '.body')}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('howItWorks.endorsementTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h3 className="font-medium text-ink">{t('howItWorks.certificateEndorsement.title')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {t('howItWorks.certificateEndorsement.body')}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <h3 className="font-medium text-ink">{t('howItWorks.courseEndorsement.title')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {t('howItWorks.courseEndorsement.body')}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        {tc('data.lastVerified', { date: nceaLevelsFile.lastVerified })} ·{' '}
        <a
          className="text-brand underline"
          href={nceaLevelsFile.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {tc('data.source')}
        </a>
      </p>
    </section>
  )
}
