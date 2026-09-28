import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import {
  newQualifications,
  newQualificationsFile,
  reformMilestones,
  reformTimelineFile,
} from '../data/ncea'
import { useLocalized } from '../hooks/useLocalized'
import { ReformNotice } from '../components/ReformNotice'
import { StatusPill, type Tone } from '../components/StatusPill'

const STATUS_TONE: Record<'confirmed' | 'proposed' | 'tbc', Tone> = {
  confirmed: 'ok',
  proposed: 'warn',
  tbc: 'neutral',
}

export default function NceaChanges() {
  const { t } = useTranslation('ncea')
  const { t: tc } = useTranslation()
  const { t: l } = useLocalized()

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('changes.title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('changes.lead')}</p>
      </header>

      <ReformNotice />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('changes.timelineTitle')}</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {reformMilestones.map((milestone) => (
            <li
              key={milestone.year}
              className="rounded-lg border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-semibold text-ink">{milestone.year}</p>
                <StatusPill tone={STATUS_TONE[milestone.status]}>
                  {t('changes.status.' + milestone.status)}
                </StatusPill>
              </div>
              {milestone.affectsYearLevel !== undefined && (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('changes.affectsYear', { year: milestone.affectsYearLevel })}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{l(milestone.event)}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('changes.qualificationsTitle')}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {newQualifications.map((qualification) => (
            <li
              key={qualification.id}
              className="rounded-lg border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-ink">{l(qualification.name)}</h3>
                <StatusPill tone={STATUS_TONE[qualification.status]}>
                  {t('changes.status.' + qualification.status)}
                </StatusPill>
              </div>
              {qualification.yearLevel !== undefined && (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('changes.forYear', { year: qualification.yearLevel })}
                </p>
              )}
              <dl className="mt-2 flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-ink-muted">{t('changes.assessment')}</dt>
                  <dd className="leading-relaxed text-ink">{l(qualification.assessment)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">{t('changes.grading')}</dt>
                  <dd className="leading-relaxed text-ink">{l(qualification.gradingScale)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">{t('changes.subjectRules')}</dt>
                  {/* 官方未公布时是 null——如实说「尚未公布」，不填猜测值 */}
                  <dd className="leading-relaxed text-ink">
                    {qualification.minSubjects == null || qualification.minSubjectsToPass == null
                      ? t('changes.notPublished')
                      : t('changes.subjectRuleValue', {
                          min: qualification.minSubjects,
                          pass: qualification.minSubjectsToPass,
                        })}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        {tc('data.lastVerified', { date: reformTimelineFile.lastVerified })} ·{' '}
        <a
          className="inline-flex items-center gap-1 text-brand underline"
          href={reformTimelineFile.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {tc('data.source')}
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        {newQualificationsFile._verify?.status === 'unverified' && (
          <span className="ml-2 text-warn">{tc('data.unverified')}</span>
        )}
      </p>
    </section>
  )
}
