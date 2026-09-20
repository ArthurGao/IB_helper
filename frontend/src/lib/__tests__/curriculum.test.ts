import { describe, expect, it } from 'vitest'
import { examYearOf, syllabusFor } from '../curriculum'
import { curriculumUpdates } from '../../data'

const firstExamsOf = (id: string): number | null =>
  curriculumUpdates.find((u) => u.id === id)?.firstExams ?? null

describe('大纲版本提示', () => {
  it('5 月 session（北半球）：入学年 + 2', () => {
    expect(examYearOf(2025, 'may')).toBe(2027)
  })

  it('11 月 session（新西兰等南半球学校）：入学年 + 1', () => {
    expect(examYearOf(2025, 'november')).toBe(2026)
  })

  it('官方周期（已核实）：2024→2026、2025→2027、2026→2028、2027→2029', () => {
    expect(firstExamsOf('first-teaching-2024')).toBe(2026)
    expect(firstExamsOf('first-teaching-2025')).toBe(2027)
    expect(firstExamsOf('first-teaching-2026')).toBe(2028)
    expect(firstExamsOf('first-teaching-2027')).toBe(2029)
  })

  it('数学在 2027 首教 / 2029 首考那一批，不在 2025 那批', () => {
    const wave2027 = curriculumUpdates.find((u) => u.id === 'first-teaching-2027')
    expect(wave2027?.subjectCodes).toContain('math-aa')
    expect(wave2027?.subjectCodes).toContain('math-ai')
    const wave2025 = curriculumUpdates.find((u) => u.id === 'first-teaching-2025')
    expect(wave2025?.subjectCodes).not.toContain('math-aa')
    // 同一科目不能同时出现在两批里，否则页面会给出自相矛盾的结论
    const seen = new Map<string, string[]>()
    for (const update of curriculumUpdates) {
      for (const code of update.subjectCodes) {
        seen.set(code, [...(seen.get(code) ?? []), update.id])
      }
    }
    for (const [code, ids] of seen) {
      expect(ids.length, `${code} 出现在多批：${ids.join(', ')}`).toBe(1)
    }
  })

  it('ESS 在 2024 首教 / 2026 首考那一批', () => {
    const wave2024 = curriculumUpdates.find((u) => u.id === 'first-teaching-2024')
    expect(wave2024?.subjectCodes).toEqual(expect.arrayContaining(['ess', 'global-politics', 'sehs']))
  })

  it('5 月 session：2027 年入学 → 数学新大纲；2026 年入学仍是旧大纲', () => {
    const math = firstExamsOf('first-teaching-2027')
    expect(syllabusFor(2027, math, 'may')).toBe('new')
    expect(syllabusFor(2026, math, 'may')).toBe('old')
  })

  it('同一入学年份，两种 session 可能给出不同结论（NZ 差一年的坑）', () => {
    const math = firstExamsOf('first-teaching-2027') // 2029
    // 2028 年入学：11 月 session 在 2029 年考 → 新大纲；5 月 session 要到 2030 年考 → 也是新大纲
    expect(syllabusFor(2028, math, 'november')).toBe('new')
    // 2027 年入学：11 月 session 在 2028 年考 → 旧大纲；5 月 session 在 2029 年考 → 新大纲
    expect(syllabusFor(2027, math, 'november')).toBe('old')
    expect(syllabusFor(2027, math, 'may')).toBe('new')
  })

  it('11 月 session：2025 年入学 → ESS（2026 首考）新大纲', () => {
    const ess = firstExamsOf('first-teaching-2024')
    expect(syllabusFor(2025, ess, 'november')).toBe('new')
    expect(syllabusFor(2024, ess, 'november')).toBe('old')
  })

  it('缺入学年份或缺 session → unknown（不推测）', () => {
    expect(syllabusFor(undefined, 2027, 'may')).toBe('unknown')
    expect(syllabusFor(2025, 2027, undefined)).toBe('unknown')
  })

  it('数据里没有首考年份 → not-announced（不说成家长没填）', () => {
    expect(syllabusFor(2025, null, 'may')).toBe('not-announced')
    expect(syllabusFor(undefined, null, 'may')).toBe('unknown')
  })
})
