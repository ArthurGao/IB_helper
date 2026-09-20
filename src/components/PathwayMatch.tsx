import { useTranslation } from 'react-i18next'
import type { PathwayMatch as Match, PathwayStatus } from '../types/ib'
import { useLocalized } from '../hooks/useLocalized'
import { subjects } from '../data'
import { StatusPill, type Tone } from './StatusPill'

const STATUS_TONE: Record<PathwayStatus, Tone> = {
  meets: 'ok',
  partial: 'warn',
  'not-met': 'danger',
}

/** `math-aa|math-ai` / `tag:science` → 家长看得懂的科目名。 */
function useTokenLabel() {
  const { t: l } = useLocalized()
  const { t } = useTranslation('selector')
  return (token: string): string =>
    token
      .split('|')
      .map((alt) => {
        if (alt.startsWith('tag:')) return t(`tags.${alt.slice(4)}`, { defaultValue: alt.slice(4) })
        const subject = subjects.find((s) => s.code === alt)
        return subject ? l(subject.name) : alt
      })
      .join(t('pathways.or'))
}

export function PathwayMatchPanel({ matches }: { matches: Match[] }) {
  const { t } = useTranslation('selector')
  const { t: l } = useLocalized()
  const label = useTokenLabel()

  if (matches.length === 0) {
    return <p className="text-sm text-ink-muted">{t('pathways.none')}</p>
  }

  return (
    <>
      <p className="mb-2 text-xs leading-relaxed text-ink-muted">{t('pathways.guidanceOnly')}</p>
      <ul className="flex flex-col gap-3">
      {matches.map((match) => (
        <li key={match.pathwayId} className="rounded-lg border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-ink">{l(match.name)}</h3>
            <StatusPill tone={STATUS_TONE[match.status]}>{t(`pathways.${match.status}`)}</StatusPill>
          </div>

          {match.requiredMissing.length > 0 && (
            <p className="mt-2 text-sm text-danger">
              {t('pathways.missingRequired', {
                subjects: match.requiredMissing.map(label).join('、'),
              })}
            </p>
          )}
          {match.recommendedMissing.length > 0 && (
            <p className="mt-1 text-sm text-warn">
              {t('pathways.missingRecommended', {
                subjects: match.recommendedMissing.map(label).join('、'),
              })}
            </p>
          )}
          {match.requiredMet.length > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              {t('pathways.met', { subjects: match.requiredMet.map(label).join('、') })}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{l(match.note)}</p>
        </li>
        ))}
      </ul>
    </>
  )
}
