import { describe, expect, it } from 'vitest'
import { calcNceaLevel } from '../calcNceaLevel'
import { nceaLevels } from '../../../data/ncea'
import { plan, subject } from './fixtures'

const coRequisiteMet = { readingCredits: 5, writingCredits: 5, numeracyCredits: 10 }

describe('calcNceaLevel', () => {
  it('60 学分 + co-requisite → 达标', () => {
    const result = calcNceaLevel(
      plan({
        subjects: [subject('english', 2, 30), subject('maths', 2, 30)],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(result.creditsCounted).toBe(60)
    expect(result.creditsMet).toBe(true)
    expect(result.coRequisiteMet).toBe(true)
    expect(result.awarded).toBe(true)
  })

  it('学分够但 co-requisite 未满足 → 不予该级（co-requisite 是闸门）', () => {
    const result = calcNceaLevel(
      plan({
        subjects: [subject('english', 2, 60)],
        literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 0 },
      }),
      2,
    )
    expect(result.creditsMet).toBe(true)
    expect(result.coRequisiteMet).toBe(false)
    expect(result.awarded).toBe(false)
  })

  it('co-requisite 的 20 学分不计入 60（2024 起的规则）', () => {
    // 只有 co-requisite，没有任何科目学分 → 计入学分为 0
    const result = calcNceaLevel(plan({ literacyNumeracy: coRequisiteMet }), 1)
    expect(result.creditsCounted).toBe(0)
    expect(result.creditsMet).toBe(false)
  })

  it('低于本级的学分不计入（Level 3 不数 Level 2 的学分）', () => {
    const result = calcNceaLevel(
      plan({
        subjects: [subject('english', 3, 20), subject('history', 2, 40)],
        literacyNumeracy: coRequisiteMet,
      }),
      3,
    )
    expect(result.creditsCounted).toBe(20)
    expect(result.awarded).toBe(false)
  })

  it('高于本级的学分计入（Level 2 数 Level 3 的学分）', () => {
    const result = calcNceaLevel(
      plan({
        subjects: [subject('english', 3, 30), subject('maths', 2, 30)],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(result.creditsCounted).toBe(60)
  })

  it('证书背书：50 个 M/E 学分 → Merit；50 个 E 学分 → Excellence', () => {
    const merit = calcNceaLevel(
      plan({
        subjects: [subject('english', 2, 60, { meritOrExcellenceCredits: 50 })],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(merit.certificateEndorsement).toBe('merit')

    const excellence = calcNceaLevel(
      plan({
        subjects: [
          subject('english', 2, 60, { meritOrExcellenceCredits: 50, excellenceCredits: 50 }),
        ],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(excellence.certificateEndorsement).toBe('excellence')
  })

  it('49 个 M/E 学分 → 无证书背书', () => {
    const result = calcNceaLevel(
      plan({
        subjects: [subject('english', 2, 60, { meritOrExcellenceCredits: 49 })],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(result.certificateEndorsement).toBe('none')
  })

  it('科目背书需 14 学分且内外各 ≥3', () => {
    const ok = calcNceaLevel(
      plan({
        subjects: [
          subject('english', 2, 20, {
            meritOrExcellenceCredits: 14,
            internalCredits: 8,
            externalCredits: 6,
          }),
        ],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(ok.subjectEndorsements).toEqual(['english'])

    // 外部评估只有 2 学分 → 不给背书
    const notEnoughExternal = calcNceaLevel(
      plan({
        subjects: [
          subject('english', 2, 20, {
            meritOrExcellenceCredits: 14,
            internalCredits: 12,
            externalCredits: 2,
          }),
        ],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(notEnoughExternal.subjectEndorsements).toEqual([])
  })

  it('没填内/外学分时不猜——宁可不给背书也不虚报', () => {
    const result = calcNceaLevel(
      plan({
        subjects: [subject('english', 2, 20, { meritOrExcellenceCredits: 20 })],
        literacyNumeracy: coRequisiteMet,
      }),
      2,
    )
    expect(result.subjectEndorsements).toEqual([])
  })

  it('三级的学分要求都来自数据文件，且都是 60', () => {
    expect(nceaLevels.map((l) => l.creditsAtLevel)).toEqual([60, 60, 60])
    expect(nceaLevels.map((l) => l.coRequisite.literacy + l.coRequisite.numeracy)).toEqual([
      20, 20, 20,
    ])
  })

  it('未知等级直接抛错，而不是返回一个编出来的结果', () => {
    expect(() => calcNceaLevel(plan(), 4 as unknown as 1)).toThrow()
  })
})
