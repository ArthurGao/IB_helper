import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Disclaimer } from './Disclaimer'
import { LangSwitch } from './LangSwitch'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/', key: 'home', end: true },
  { to: '/learn', key: 'learn', end: false },
  { to: '/selector', key: 'selector', end: false },
  { to: '/compare', key: 'compare', end: false },
  { to: '/nz', key: 'nz', end: false },
  { to: '/updates', key: 'updates', end: false },
  { to: '/glossary', key: 'glossary', end: false },
] as const

export function Layout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh">
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/" className="mr-auto text-base font-semibold text-ink">
            {t('appName')}
          </NavLink>
          <LangSwitch />
          <ThemeToggle />
        </div>
        <nav aria-label={t('nav.home')} className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'font-medium text-brand underline' : 'text-ink-muted hover:text-ink'
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <Outlet />
        <Disclaimer />
      </main>
    </div>
  )
}
