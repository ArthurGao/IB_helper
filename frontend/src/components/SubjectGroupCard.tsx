import { useTranslation } from 'react-i18next'
import type { GroupId, Level, Subject, SubjectGroup } from '../types/ib'
import { useLocalized } from '../hooks/useLocalized'
import { LevelToggle } from './LevelToggle'
import { availableLevels } from '../lib/ib-rules'

interface Props {
  group: SubjectGroup
  /** 槽位编号；第 6 槽可放 Group 6 或 Group 1–4 的第二门。 */
  slot: GroupId
  options: Subject[]
  selected?: { code: string; level: Level }
  /** 已知考试年份时，只显示当年大纲提供的层级。 */
  examYear?: number
  onPick: (code: string, level: Level) => void
  onLevel: (code: string, level: Level) => void
}

export function SubjectGroupCard({
  group,
  slot,
  options,
  selected,
  examYear,
  onPick,
  onLevel,
}: Props) {
  const { t } = useTranslation('selector')
  const { t: l } = useLocalized()

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4">
      <header className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {slot === 6 ? t('step2.slot6') : `Group ${group.id}`}
        </p>
        <h3 className="font-medium text-ink">{l(group.name)}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l(group.description)}</p>
      </header>

      <ul className="flex flex-col gap-2">
        {options.map((subject) => {
          const isSelected = selected?.code === subject.code
          const levels = availableLevels(subject, examYear)
          const level = isSelected ? selected.level : (levels[0] ?? 'SL')
          return (
            <li key={subject.code} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onPick(subject.code, level)}
                className={`flex-1 rounded-md border px-3 py-2 text-left text-sm ${
                  isSelected
                    ? 'border-brand bg-brand/10 font-medium text-ink'
                    : 'border-border text-ink-muted hover:text-ink'
                }`}
              >
                {l(subject.name)}
                {subject.satisfiesGroups && (
                  <span className="ml-2 text-xs text-ink-muted">
                    {t('step2.covers', { groups: subject.satisfiesGroups.join(' + ') })}
                  </span>
                )}
                {subject.note && (
                  <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                    {l(subject.note)}
                  </span>
                )}
              </button>
              {isSelected && (
                <LevelToggle
                  value={selected.level}
                  available={levels}
                  onChange={(next) => onLevel(subject.code, next)}
                  label={l(subject.name)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
