import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const CARDS = [
  'math-aa-vs-ai',
  'language-choice',
  'hl-workload',
  'keep-doors-open',
  'group6-swap',
  'school-offer',
  'ee-cas-timing',
  'changing-later',
] as const

/** 可搜索的知识卡片（规格 4.1 /learn/considerations）。 */
export default function Considerations() {
  const { t } = useTranslation('learn')
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const visible = CARDS.filter((card) => {
    if (!needle) return true
    return `${t(`cards.${card}.title`)} ${t(`cards.${card}.body`)}`.toLowerCase().includes(needle)
  })

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('considerations.title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('considerations.lead')}</p>
      </header>

      <label className="flex max-w-md flex-col gap-1 text-sm text-ink">
        {t('considerations.search')}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-md border border-border bg-surface-raised px-3 py-2"
        />
      </label>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => (
          <li key={card} className="rounded-lg border border-border bg-surface-raised p-4">
            <h2 className="font-medium text-ink">{t(`cards.${card}.title`)}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(`cards.${card}.body`)}</p>
          </li>
        ))}
      </ul>

      {visible.length === 0 && <p className="text-sm text-ink-muted">{t('considerations.noResults')}</p>}
    </section>
  )
}
