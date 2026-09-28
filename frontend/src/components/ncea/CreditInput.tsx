interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  max?: number
}

/** 学分输入框。家长填的是预计值，所以允许 0 且不做上限强制。 */
export function CreditInput({ label, value, onChange, hint, max = 200 }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="w-full rounded-md border border-border bg-surface-raised px-3 py-2"
      />
      {hint && <span className="text-xs leading-relaxed text-ink-muted">{hint}</span>}
    </label>
  )
}
