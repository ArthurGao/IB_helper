import { describe, expect, it } from 'vitest'
import type { WarningRule } from '../../../types/ib'
import { pathways, subjects } from '../../../data'
import { getWarnings } from '../getWarnings'
import { BASELINE, sel } from './fixtures'

const ids = (warnings: ReturnType<typeof getWarnings>) => warnings.map((w) => w.id)

describe('getWarnings', () => {
  it('STEM 方向选了数学 AI → high 警告', () => {
    const selection = sel(
      ['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'physics:HL', 'math-ai:HL', 'visual-arts:HL'],
      { targetPathwayIds: ['engineering'] },
    )
    const warnings = getWarnings(selection)
    const mathWarning = warnings.find((w) => w.id === 'math-ai-for-stem')
    expect(mathWarning?.severity).toBe('high')
    expect(mathWarning?.msg.zh).toContain('AA')
  })

  it('STEM 方向选了数学 AA → 不出该警告', () => {
    const selection = sel(
      ['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'physics:HL', 'math-aa:HL', 'visual-arts:HL'],
      { targetPathwayIds: ['engineering'] },
    )
    expect(ids(getWarnings(selection))).not.toContain('math-ai-for-stem')
  })

  it('目标含医学但缺 HL 生物 → 给出通用建议提示（不是「关门」判定）', () => {
    const selection = sel(BASELINE, { targetPathwayIds: ['medicine'] })
    expect(ids(getWarnings(selection))).toContain('medicine-hl-guidance')
  })

  it('医学建议齐备 → 不再提示', () => {
    const selection = sel(
      ['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'biology:HL', 'math-aa:HL'],
      { targetPathwayIds: ['medicine'] },
    )
    expect(ids(getWarnings(selection))).not.toContain('medicine-hl-guidance')
  })

  it('HL 数学 AA + 物理 + 化学（仅 3 HL）→ 工作量提示', () => {
    const selection = sel([
      'lang-a-lit-en:SL',
      'mandarin-b:SL',
      'history:SL',
      'chemistry:HL',
      'physics:HL',
      'math-aa:HL',
    ])
    expect(ids(getWarnings(selection))).toContain('heavy-hl-load')
  })

  it('母语非英语却把英语放 Group 1 → 提示', () => {
    const warnings = getWarnings(sel(BASELINE), { nativeLanguageIsEnglish: false })
    expect(ids(warnings)).toContain('english-in-group-1-for-non-native')
  })

  it('未提供母语信息时不出该提示（不臆测）', () => {
    expect(ids(getWarnings(sel(BASELINE)))).not.toContain('english-in-group-1-for-non-native')
  })

  it('组合合法但不满足 NZ UE → 明确警告', () => {
    const selection = sel([
      'lang-a-lit-zh:HL',
      'french-b:SL',
      'history:SL',
      'chemistry:HL',
      'math-aa:HL',
      'visual-arts:SL',
    ])
    expect(ids(getWarnings(selection))).toContain('nz-ue-not-met')
  })

  it('满足 NZ UE 时不出该警告', () => {
    expect(ids(getWarnings(sel(BASELINE)))).not.toContain('nz-ue-not-met')
  })

  it('每条警告都带双语文案', () => {
    const warnings = getWarnings(sel(BASELINE, { targetPathwayIds: ['medicine'] }), {
      nativeLanguageIsEnglish: false,
    })
    expect(warnings.length).toBeGreaterThan(0)
    for (const warning of warnings) {
      expect(warning.msg.en.length).toBeGreaterThan(0)
      expect(warning.msg.zh.length).toBeGreaterThan(0)
    }
  })

  it('新增规则只需加数据，不需要改代码', () => {
    const extraRule: WarningRule = {
      id: 'test-only-rule',
      when: { subjectsAny: ['visual-arts'], hlCountIn: [3] },
      severity: 'low',
      msg: { en: 'test', zh: '测试' },
    }
    const warnings = getWarnings(
      sel(BASELINE),
      {},
      { subjects, pathways, rules: [extraRule] },
    )
    expect(ids(warnings)).toEqual(['test-only-rule'])
  })
})
