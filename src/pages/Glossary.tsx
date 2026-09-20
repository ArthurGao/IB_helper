import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const TERMS = ['hl-sl', 'tok', 'ee', 'cas', 'aa-ai', 'diploma-vs-course', 'ue', 'myp-dp'] as const
const FAQS = ['when-to-choose', 'how-many-hl', 'can-change', 'what-if-fail', 'which-math', 'nz-vs-overseas'] as const

export default function Glossary() {
  const { t } = useTranslation('glossary')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()

  const match = (prefix: string, key: string) =>
    !needle ||
    `${t(`${prefix}.${key}.term`, { defaultValue: '' })} ${t(`${prefix}.${key}.q`, { defaultValue: '' })} ${t(`${prefix}.${key}.body`, { defaultValue: '' })} ${t(`${prefix}.${key}.a`, { defaultValue: '' })}`
      .toLowerCase()
      .includes(needle)

  const terms = TERMS.filter((key) => match('terms', key))
  const faqs = FAQS.filter((key) => match('faq', key))

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>
        <p className="max-w-2xl leading-relaxed text-ink-muted">{t('lead')}</p>
      </header>

      <label className="flex max-w-md flex-col gap-1 text-sm text-ink">
        {t('search')}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-md border border-border bg-surface-raised px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('termsTitle')}</h2>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {terms.map((key) => (
            <div key={key} className="rounded-lg border border-border bg-surface-raised p-4">
              <dt className="font-medium text-ink">{t(`terms.${key}.term`)}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{t(`terms.${key}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-ink">{t('faqTitle')}</h2>
        <ul className="flex flex-col gap-2">
          {faqs.map((key) => (
            <li key={key} className="rounded-lg border border-border bg-surface-raised p-4">
              <details>
                <summary className="cursor-pointer font-medium text-ink">{t(`faq.${key}.q`)}</summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`faq.${key}.a`)}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>

      {terms.length === 0 && faqs.length === 0 && (
        <p className="text-sm text-ink-muted">{t('noResults')}</p>
      )}
    </section>
  )
}
