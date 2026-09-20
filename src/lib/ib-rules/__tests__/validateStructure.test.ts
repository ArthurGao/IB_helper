import { describe, expect, it } from 'vitest'
import { validateStructure } from '../validateStructure'
import { BASELINE, sel } from './fixtures'

const errorIds = (codes: string[]): string[] =>
  validateStructure(sel(codes)).errors.map((e) => e.id)

describe('validateStructure', () => {
  it('接受合法的 6 门组合（每组一门 + 3 HL）', () => {
    const result = validateStructure(sel(BASELINE))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('接受 4 HL', () => {
    const result = validateStructure(
      sel(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:HL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    )
    expect(result.valid).toBe(true)
  })

  it('拒绝 HL 数量不在 3–4 之间', () => {
    expect(
      errorIds(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'math-aa:SL', 'visual-arts:SL']),
    ).toContain('hl-count')
    expect(
      errorIds(['lang-a-lit-en:HL', 'mandarin-b:HL', 'history:HL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    ).toContain('hl-count')
  })

  it('拒绝科目数不等于 6', () => {
    expect(errorIds(BASELINE.slice(0, 5))).toContain('subject-count')
  })

  it('拒绝重复科目', () => {
    expect(
      errorIds(['lang-a-lit-en:HL', 'lang-a-lit-en:SL', 'history:SL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    ).toContain('duplicate-subject')
  })

  it('拒绝未知科目 code', () => {
    expect(
      errorIds(['not-a-subject:HL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    ).toContain('unknown-subject')
  })

  it('拒绝该科目不提供的层级（Literature and Performance 只有 SL）', () => {
    expect(
      errorIds([
        'literature-and-performance:HL',
        'mandarin-b:SL',
        'history:SL',
        'chemistry:HL',
        'math-aa:HL',
        'biology:SL',
      ]),
    ).toContain('level-not-offered')
  })

  it('接受 ESS HL（官方 2024 起同时提供 SL 与 HL）', () => {
    const result = validateStructure(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'ess:HL', 'physics:HL', 'math-aa:HL', 'visual-arts:SL']),
    )
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('拒绝缺组（两门 Group 1、没有 Group 2）', () => {
    expect(
      errorIds(['lang-a-lit-en:HL', 'lang-a-lit-zh:SL', 'history:SL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    ).toContain('group-coverage')
  })

  it('拒绝两门数学', () => {
    const ids = errorIds([
      'lang-a-lit-en:HL',
      'mandarin-b:SL',
      'history:SL',
      'math-ai:SL',
      'math-aa:HL',
      'visual-arts:HL',
    ])
    expect(ids).toContain('math-count')
  })

  it('拒绝一门数学都没有', () => {
    expect(
      errorIds(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'biology:HL', 'visual-arts:SL']),
    ).toContain('math-count')
  })

  it('接受 Group 6 替换：用 Group 4 的第二门顶艺术', () => {
    const result = validateStructure(
      sel(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'math-aa:HL', 'biology:SL']),
    )
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('接受跨学科 ESS 同时顶 Group 3 与 Group 4', () => {
    const result = validateStructure(
      sel(['lang-a-lit-en:HL', 'mandarin-b:SL', 'ess:SL', 'physics:HL', 'math-aa:HL', 'visual-arts:SL']),
    )
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('接受 ESS 只当作 Group 4（Group 3 另选历史）', () => {
    const result = validateStructure(
      sel(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:HL', 'ess:SL', 'math-aa:HL', 'visual-arts:SL']),
    )
    expect(result.valid).toBe(true)
  })

  it('接受 Literature and Performance 同时顶 Group 1 与 Group 6', () => {
    const result = validateStructure(
      sel(['literature-and-performance:SL', 'mandarin-b:SL', 'history:HL', 'chemistry:HL', 'math-aa:HL', 'biology:SL']),
    )
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('拒绝两门 Group 6（替换只能来自 Group 1–4）', () => {
    expect(
      errorIds(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:SL', 'math-aa:HL', 'visual-arts:HL', 'music:SL']),
    ).toContain('group-coverage')
  })

  it('错误只带 id / params，不含硬编码文案（交给 i18n）', () => {
    const [first] = validateStructure(sel(BASELINE.slice(0, 5))).errors
    expect(first?.id).toBe('subject-count')
    expect(first?.msg).toBeUndefined()
  })
})
