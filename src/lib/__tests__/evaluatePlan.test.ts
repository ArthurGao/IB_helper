import { describe, expect, it } from 'vitest'
import type { Plan, SelectedSubject } from '../../types/ib'
import { displayTotal, evaluatePlan } from '../evaluatePlan'
import { emptyPlan, reconcilePlan } from '../plan'

function planOf(picks: string[], over: Partial<Plan> = {}): Plan {
  const subjects: SelectedSubject[] = picks.map((entry) => {
    const [code = '', level = 'SL'] = entry.split(':')
    return { code, level: level as 'HL' | 'SL' }
  })
  const grades = Object.fromEntries(subjects.map((s) => [s.code, 7 as const]))
  return reconcilePlan({
    ...emptyPlan(),
    subjects,
    grades: { safe: grades, best: grades },
    tok: 'A',
    ee: 'A',
    casComplete: true,
    ...over,
  })
}

const VALID = [
  'lang-a-lit-en:HL',
  'mandarin-b:SL',
  'history:SL',
  'chemistry:HL',
  'math-aa:HL',
  'visual-arts:SL',
]

describe('evaluatePlan（选课页与对比页共用的唯一评估入口）', () => {
  it('合法的六门满分方案 → 通过，并给出总分', () => {
    const evaluation = evaluatePlan(planOf(VALID))
    expect(evaluation.valid).toBe(true)
    expect(evaluation.diploma.safe.status).toBe('pass')
    expect(displayTotal(evaluation.diploma.safe)).toBe(45)
  })

  it('六门但结构非法（全是 SL，HL 数量不对）即使满分也不给总分', () => {
    const evaluation = evaluatePlan(
      planOf([
        'lang-a-lit-en:SL',
        'mandarin-b:SL',
        'history:SL',
        'chemistry:SL',
        'math-aa:SL',
        'visual-arts:SL',
      ]),
    )
    expect(evaluation.valid).toBe(false)
    expect(evaluation.errors.map((e) => e.id)).toContain('hl-count')
    expect(evaluation.diploma.safe.status).toBe('incomplete')
    expect(evaluation.diploma.safe.incompleteReason).toBe('structure')
    expect(displayTotal(evaluation.diploma.safe)).toBeNull()
  })

  it('旧链接里挤不进合法槽位的科目会被丢弃，并如实反映为「没选满」', () => {
    // 三门 Group 3：一门占 Group 3、一门占替换槽 6，第三门无处可放 → 丢弃
    const evaluation = evaluatePlan(
      planOf([
        'lang-a-lit-en:HL',
        'geography:SL',
        'history:HL',
        'chemistry:HL',
        'math-aa:SL',
        'economics:SL',
      ]),
    )
    expect(evaluation.diploma.safe.status).toBe('incomplete')
    expect(evaluation.diploma.safe.incompleteReason).toBe('subject-count')
    expect(displayTotal(evaluation.diploma.safe)).toBeNull()
  })

  it('未选满六门 → incomplete，不给总分', () => {
    const evaluation = evaluatePlan(planOf(VALID.slice(0, 5)))
    expect(evaluation.diploma.safe.status).toBe('incomplete')
    expect(displayTotal(evaluation.diploma.safe)).toBeNull()
  })

  it('按考试年份判层级：同一方案在 2025 年非法、2026 年合法（ESS HL）', () => {
    const picks = [
      'lang-a-lit-en:SL',
      'mandarin-b:SL',
      'ess:HL',
      'physics:HL',
      'math-aa:HL',
      'visual-arts:SL',
    ]
    const old = evaluatePlan(planOf(picks, { dpStartYear: 2024, examSession: 'november' }))
    expect(old.examYear).toBe(2025)
    expect(old.valid).toBe(false)
    expect(old.errors.map((e) => e.id)).toContain('level-not-offered-this-year')

    const current = evaluatePlan(planOf(picks, { dpStartYear: 2024, examSession: 'may' }))
    expect(current.examYear).toBe(2026)
    expect(current.valid).toBe(true)
  })

  it('空方案不会崩，也不会报「通过」', () => {
    const evaluation = evaluatePlan(emptyPlan())
    expect(evaluation.valid).toBe(false)
    expect(evaluation.diploma.safe.status).toBe('incomplete')
    expect(displayTotal(evaluation.diploma.safe)).toBeNull()
  })
})
