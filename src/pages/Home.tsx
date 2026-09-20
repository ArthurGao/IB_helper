import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLocalized } from '../hooks/useLocalized'
import { groups, diplomaRules } from '../data'
import { Timeline } from '../components/Timeline'

export default function Home() {
  const { t } = useTranslation()
  const { t: l } = useLocalized()

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-ink">{t('appName')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('appTagline')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/selector"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink"
          >
            {t('nav.selector')}
          </Link>
          <Link
            to="/learn"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink"
          >
            {t('nav.learn')}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('home.timeline')}</h2>
        <Timeline />
      </div>

      {/* 六大学科组：数据驱动（src/data/groups.json），名称取当前语言。 */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.id} className="rounded-lg border border-border bg-surface-raised p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Group {group.id}
            </p>
            <p className="mt-1 font-medium text-ink">{l(group.name)}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l(group.description)}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-ink-muted">
        {t('home.scoring', { max: diplomaRules.maxPoints, pass: diplomaRules.passMark })}
      </p>
    </section>
  )
}
