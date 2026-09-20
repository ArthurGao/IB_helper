import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-ok/40 text-ok',
  warn: 'border-warn/40 text-warn',
  danger: 'border-danger/40 text-danger',
  neutral: 'border-border text-ink-muted',
}

const TONE_ICON: Record<Tone, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
  neutral: HelpCircle,
}

/**
 * 语义状态标签。颜色 + 图标 + 文字三重表达，
 * 色盲用户与屏幕阅读器都能拿到同样的信息（规格 11 / 10-P2）。
 */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = TONE_ICON[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {children}
    </span>
  )
}
