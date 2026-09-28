import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ReformNotice } from '../components/ReformNotice'

const SECTIONS = [
  { to: '/ncea/how-it-works', key: 'howItWorks' },
  { to: '/ncea/university', key: 'university' },
  { to: '/ncea/calculator', key: 'calculator' },
  { to: '/ncea/changes', key: 'changes' },
  { to: '/ncea/which-one', key: 'whichOne' },
] as const

export default function Ncea() {
  const { t } = useTranslation('ncea')
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('lead')}</p>
      </header>

      <ReformNotice />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              className="block h-full rounded-lg border border-border bg-surface-raised p-4 hover:border-brand"
            >
              <h2 className="font-medium text-ink">{t(`nav.${section.key}`)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {t(`${section.key}.lead`)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
