import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { groups, subjects, diplomaRules } from '../data'
import { useLocalized } from '../hooks/useLocalized'
import { Timeline } from '../components/Timeline'

const CORE = ['tok', 'ee', 'cas'] as const

export default function Learn() {
  const { t } = useTranslation('learn')
  const { t: l } = useLocalized()

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('lead')}</p>
      </header>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('timeline.title')}</h2>
        <Timeline />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('groups.title')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const examples = subjects.filter((s) => (s.satisfiesGroups ?? [s.group]).includes(group.id))
            return (
              <li key={group.id} className="rounded-lg border border-border bg-surface-raised p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Group {group.id}
                </p>
                <h3 className="mt-1 font-medium text-ink">{l(group.name)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l(group.description)}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-brand">
                    {t('groups.showSubjects', { count: examples.length })}
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-muted">
                    {examples.map((subject) => (
                      <li key={subject.code}>
                        {l(subject.name)} — {subject.levels.join(' / ')}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('core.title')}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {CORE.map((item) => (
            <li key={item} className="rounded-lg border border-border bg-surface-raised p-4">
              <h3 className="font-medium text-ink">{t(`core.${item}.title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(`core.${item}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h2 className="font-medium text-ink">{t('scoring.title')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          {t('scoring.body', { max: diplomaRules.maxPoints, pass: diplomaRules.passMark })}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          {t('scoring.source', { date: diplomaRules.lastVerified })}
        </p>
      </div>

      <Link to="/learn/considerations" className="text-sm font-medium text-brand">
        {t('considerations.title')} →
      </Link>
    </section>
  )
}
