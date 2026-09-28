import { describe, expect, it } from 'vitest'
import { checkUniversityEntrance } from '../checkUniversityEntrance'
import { ueApprovedSubjects, ueRequirementsFile } from '../../../data/ncea'
import { plan, subject, uePassingPlan } from './fixtures'

const componentOf = (result: ReturnType<typeof checkUniversityEntrance>, id: string) =>
  result.components.find((c) => c.id === id)

describe('checkUniversityEntrance', () => {
  it('四项齐备 → 达到 UE', () => {
    const result = checkUniversityEntrance(uePassingPlan())
    expect(result.ueAwarded).toBe(true)
    expect(result.components.every((c) => c.met)).toBe(true)
  })

  it('缺 NCEA Level 3 → 未达 UE', () => {
    const result = checkUniversityEntrance({ ...uePassingPlan(), nceaLevel3Awarded: false })
    expect(result.ueAwarded).toBe(false)
    expect(componentOf(result, 'ncea-level-3')?.met).toBe(false)
  })

  it('只有两门认可科目 → 未达 UE，并指出还差 1 门', () => {
    const base = uePassingPlan()
    const result = checkUniversityEntrance({ ...base, subjects: base.subjects.slice(0, 2) })
    expect(result.ueAwarded).toBe(false)
    const component = componentOf(result, 'approved-subjects')
    expect(component?.met).toBe(false)
    expect(component?.gap).toBe(1)
  })

  it('科目学分 13 < 14 → 该门不计入', () => {
    const result = checkUniversityEntrance(
      plan({
        nceaLevel3Awarded: true,
        subjects: [subject('english', 3, 14), subject('calculus', 3, 14), subject('physics', 3, 13)],
        literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 10 },
      }),
    )
    expect(componentOf(result, 'approved-subjects')?.detail?.qualifying).toBe(2)
    expect(result.ueAwarded).toBe(false)
  })

  it('非认可科目不计入三门（即使学分够）', () => {
    const result = checkUniversityEntrance(
      plan({
        nceaLevel3Awarded: true,
        subjects: [
          subject('english', 3, 14),
          subject('calculus', 3, 14),
          subject('not-an-approved-subject', 3, 24),
        ],
        literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 10 },
      }),
    )
    expect(componentOf(result, 'approved-subjects')?.met).toBe(false)
  })

  it('Level 2 的学分不能顶 UE 的 Level 3 科目要求', () => {
    const result = checkUniversityEntrance(
      plan({
        nceaLevel3Awarded: true,
        subjects: [subject('english', 3, 14), subject('calculus', 3, 14), subject('physics', 2, 20)],
        literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 10 },
      }),
    )
    expect(componentOf(result, 'approved-subjects')?.detail?.qualifying).toBe(2)
  })

  it('读写：阅读够但写作不够 → 未达标，缺口为写作差额', () => {
    const base = uePassingPlan()
    const result = checkUniversityEntrance({
      ...base,
      literacyNumeracy: { readingCredits: 5, writingCredits: 2, numeracyCredits: 10 },
    })
    const literacy = componentOf(result, 'ue-literacy')
    expect(literacy?.met).toBe(false)
    expect(literacy?.gap).toBe(3)
    expect(result.ueAwarded).toBe(false)
  })

  it('读写：总数够但阅读写作分布不合格仍算未达标', () => {
    const base = uePassingPlan()
    const result = checkUniversityEntrance({
      ...base,
      literacyNumeracy: { readingCredits: 10, writingCredits: 0, numeracyCredits: 10 },
    })
    expect(componentOf(result, 'ue-literacy')?.met).toBe(false)
  })

  it('算术不足 → 未达 UE 并给出缺口', () => {
    const base = uePassingPlan()
    const result = checkUniversityEntrance({
      ...base,
      literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 4 },
    })
    expect(componentOf(result, 'ue-numeracy')?.gap).toBe(6)
    expect(result.ueAwarded).toBe(false)
  })

  it('四项中任缺其一都判未达 UE（规格验收标准）', () => {
    const base = uePassingPlan()
    const breakers: Array<[string, typeof base]> = [
      ['ncea-level-3', { ...base, nceaLevel3Awarded: false }],
      ['approved-subjects', { ...base, subjects: base.subjects.slice(0, 2) }],
      [
        'ue-literacy',
        { ...base, literacyNumeracy: { readingCredits: 0, writingCredits: 5, numeracyCredits: 10 } },
      ],
      [
        'ue-numeracy',
        { ...base, literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 0 } },
      ],
    ]
    for (const [id, broken] of breakers) {
      const result = checkUniversityEntrance(broken)
      expect(result.ueAwarded, id).toBe(false)
      expect(componentOf(result, id)?.met, id).toBe(false)
    }
  })

  it('阈值全部来自数据文件（引擎内无硬编码）', () => {
    expect(ueRequirementsFile.approvedSubjectCount).toBe(3)
    expect(ueRequirementsFile.approvedSubjectCredits).toBe(14)
    expect(ueRequirementsFile.literacy).toEqual({
      credits: 10,
      minReading: 5,
      minWriting: 5,
      minLevel: 2,
    })
    expect(ueRequirementsFile.numeracy).toEqual({ credits: 10, minLevel: 1 })
  })

  it('改数据即改行为：把认可科目数调成 4，原本达标的方案就不再达标', () => {
    const stricter = {
      ...ueRequirementsFile,
      approvedSubjectCount: 4,
    }
    const result = checkUniversityEntrance(uePassingPlan(), {
      rules: stricter,
      approvedSubjects: ueApprovedSubjects,
    })
    expect(result.ueAwarded).toBe(false)
  })
})
