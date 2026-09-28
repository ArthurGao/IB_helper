import { describe, expect, it } from 'vitest'
import { resolveQualificationByYear } from '../resolveQualificationByYear'
import { describeNewQualification, hasPublishedAssessmentRules } from '../describeNewQualification'
import { newQualifications, reformMilestones } from '../../../data/ncea'

describe('resolveQualificationByYear', () => {
  it('2026 年的 9 年级：逐年推算到 Year 13（规格验收标准）', () => {
    const rows = resolveQualificationByYear(9, 2026)
    expect(rows.map((r) => [r.year, r.yearLevel, r.qualification])).toEqual([
      [2026, 9, 'unknown'],
      [2027, 10, 'unknown'],
      // 2028 年读 Year 11 → 首批 Foundational Award
      [2028, 11, 'foundational'],
      [2029, 12, 'nzce'],
      [2030, 13, 'nzace'],
    ])
  })

  it('这一届完整走完新体系，中途不换制度', () => {
    const senior = resolveQualificationByYear(9, 2026).filter((r) => r.yearLevel >= 11)
    expect(senior.every((r) => r.qualification !== 'ncea-1')).toBe(true)
    expect(senior.map((r) => r.qualification)).toEqual(['foundational', 'nzce', 'nzace'])
  })

  it('2026 年的 13 年级：仍考 NCEA Level 3', () => {
    const rows = resolveQualificationByYear(13, 2026)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.qualification).toBe('ncea-3')
  })

  it('2026 年的 11 年级：三年都考 NCEA（NZACE 要到 2030 才开始）', () => {
    const rows = resolveQualificationByYear(11, 2026)
    expect(rows.map((r) => r.qualification)).toEqual(['ncea-1', 'ncea-2', 'ncea-3'])
    // 仍考 NCEA 的行要说明替代资格何时开始，否则家长不知道自己这届为什么不受影响
    expect(rows[0]?.note.zh).toContain('2028')
  })

  it('分阶段推出的结果：没有任何一届会中途从 NCEA 切到新资格', () => {
    const isNcea = (q: string) => q.startsWith('ncea-')
    for (let startYear = 2024; startYear <= 2034; startYear += 1) {
      const senior = resolveQualificationByYear(11, startYear).filter((r) => r.yearLevel >= 11)
      const systems = new Set(senior.map((r) => (isNcea(r.qualification) ? 'ncea' : 'new')))
      expect(systems.size, `Year 11 in ${startYear} 混用了两套制度`).toBe(1)
    }
  })

  it('日期全部来自数据：把 Foundational 的里程碑推到 2031，Year 11 就回到 NCEA', () => {
    const moved = reformMilestones.map((m) =>
      m.affectsYearLevel === 11 ? { ...m, year: 2031 } : m,
    )
    const rows = resolveQualificationByYear(11, 2028, {
      milestones: moved,
      qualifications: newQualifications,
      finalYearLevel: 13,
    })
    expect(rows[0]?.qualification).toBe('ncea-1')
  })

  it('每一行都带来源状态，未定稿的资格不会被说成已确定', () => {
    for (const row of resolveQualificationByYear(9, 2026)) {
      expect(['confirmed', 'proposed', 'tbc']).toContain(row.status)
    }
  })
})

describe('describeNewQualification', () => {
  it('返回资格说明，且都标为尚未定稿', () => {
    for (const id of ['foundational', 'nzce', 'nzace'] as const) {
      const q = describeNewQualification(id)
      expect(q, id).toBeDefined()
      expect(q?.status, id).toBe('proposed')
    }
  })

  it('官方未公布的字段保持 null——不采用规格里的猜测值', () => {
    for (const q of newQualifications) {
      expect(q.minSubjects, q.id).toBeNull()
      expect(q.minSubjectsToPass, q.id).toBeNull()
    }
  })

  it('在官方公布评估规则前，不允许做通过/失败判定', () => {
    for (const q of newQualifications) {
      expect(hasPublishedAssessmentRules(q), q.id).toBe(false)
    }
  })

  it('未知 id 返回 undefined，不编造', () => {
    expect(describeNewQualification('not-a-qualification' as 'nzce')).toBeUndefined()
  })
})
