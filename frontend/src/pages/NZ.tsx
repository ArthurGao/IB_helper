import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import type { Programme } from '../types/ib'
import { schools, schoolsFile, universities } from '../data'
import { useLocalized } from '../hooks/useLocalized'
import { StatusPill } from '../components/StatusPill'

const PROGRAMMES: Programme[] = ['PYP', 'MYP', 'DP', 'CP']

export default function NZ() {
  const { t } = useTranslation('nz')
  const { t: tc } = useTranslation()
  const { t: l } = useLocalized()
  const [city, setCity] = useState('')
  const [programme, setProgramme] = useState<Programme | ''>('')

  const cities = useMemo(
    () => [...new Set(schools.map((school) => l(school.city)))].sort(),
    [l],
  )

  const visible = schools.filter((school) => {
    if (city && l(school.city) !== city) return false
    if (programme && !school.programmes.includes(programme)) return false
    return true
  })

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('lead')}</p>
      </header>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h2 className="font-medium text-ink">{t('ue.title')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('ue.body')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('universities.title')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {universities.map((university) => (
            <li key={university.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-ink">{l(university.name)}</h3>
                <StatusPill tone="neutral">
                  {t('universities.minPoints', { points: university.ibMinPoints })}
                </StatusPill>
              </div>
              {university.notes && (
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l(university.notes)}</p>
              )}
              <p className="mt-2 text-xs text-ink-muted">
                {tc('data.lastVerified', { date: university.lastVerified })}
                {' · '}
                {university.sourceUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-brand underline"
                    href={university.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tc('data.source')}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                ) : (
                  <span className="text-warn">{tc('data.unverified')}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-ink-muted">{t('universities.note')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('schools.title')}</h2>
        <p className="rounded-md border border-warn/40 p-3 text-sm text-ink">
          {t('schools.verifyHint')}{' '}
          <a
            className="inline-flex items-center gap-1 text-brand underline"
            href={schoolsFile.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('schools.directory')}
            <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </p>

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            {t('schools.city')}
            <select
              className="rounded-md border border-border bg-surface-raised px-3 py-2"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option value="">{t('schools.all')}</option>
              {cities.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            {t('schools.programme')}
            <select
              className="rounded-md border border-border bg-surface-raised px-3 py-2"
              value={programme}
              onChange={(event) => setProgramme(event.target.value as Programme | '')}
            >
              <option value="">{t('schools.all')}</option>
              {PROGRAMMES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((school) => (
            <li key={school.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <h3 className="font-medium text-ink">{l(school.name)}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {l(school.city)} · {school.programmes.join(' / ')}
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                {tc('data.lastVerified', { date: school.lastVerified })}
              </p>
              {school._verify && (
                <p className="mt-1 text-xs leading-relaxed text-warn">{l(school._verify.note)}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
