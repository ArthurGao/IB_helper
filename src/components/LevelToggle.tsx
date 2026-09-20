import { useTranslation } from 'react-i18next'
import type { Level } from '../types/ib'

interface Props {
  value: Level
  available: Level[]
  onChange: (level: Level) => void
  label: string
}

/** HL / SL 切换。只提供该科目实际开设的层级。 */
export function LevelToggle({ value, available, onChange, label }: Props) {
  const { t } = useTranslation('selector')
  return (
    <div
      role="group"
      aria-label={`${label} — ${t('level.label')}`}
      className="inline-flex rounded-md border border-border"
    >
      {(['SL', 'HL'] as const).map((level) => {
        const offered = available.includes(level)
        return (
          <button
            key={level}
            type="button"
            disabled={!offered}
            aria-pressed={value === level}
            onClick={() => onChange(level)}
            className={`px-3 py-1 text-xs font-medium first:rounded-l-md last:rounded-r-md ${
              value === level ? 'bg-brand text-brand-ink' : 'text-ink-muted'
            } ${offered ? 'hover:text-ink' : 'cursor-not-allowed opacity-40'}`}
          >
            {level}
          </button>
        )
      })}
    </div>
  )
}
