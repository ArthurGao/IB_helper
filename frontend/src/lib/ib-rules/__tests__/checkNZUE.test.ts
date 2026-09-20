import { describe, expect, it } from 'vitest'
import { checkNZUE } from '../checkNZUE'
import { sel } from './fixtures'

describe('checkNZUE', () => {
  it('英语 A（SL）+ 任一数学 → 读写与算术都满足', () => {
    const result = checkNZUE(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:HL', 'chemistry:HL', 'math-ai:HL', 'visual-arts:SL']),
    )
    expect(result.ueLiteracy).toBe(true)
    expect(result.ueNumeracy).toBe(true)
    expect(result.ueLiteracyNumeracy).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('英语 B 在 HL → 读写满足', () => {
    const result = checkNZUE(
      sel(['lang-a-lit-zh:SL', 'english-b:HL', 'history:HL', 'chemistry:HL', 'math-aa:SL', 'visual-arts:SL']),
    )
    expect(result.ueLiteracy).toBe(true)
  })

  it('英语 B 只在 SL → 读写不满足', () => {
    const result = checkNZUE(
      sel(['lang-a-lit-zh:HL', 'english-b:SL', 'history:HL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    )
    expect(result.ueLiteracy).toBe(false)
    expect(result.missing.map((m) => m.id)).toContain('ue-literacy')
  })

  it('完全没有英语科目 → 读写不满足', () => {
    const result = checkNZUE(
      sel(['lang-a-lit-zh:HL', 'french-b:SL', 'history:SL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
    )
    expect(result.ueLiteracy).toBe(false)
    expect(result.ueLiteracyNumeracy).toBe(false)
  })

  it('没有数学 → 算术不满足', () => {
    const result = checkNZUE(
      sel(['lang-a-lit-en:HL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'biology:HL', 'visual-arts:SL']),
    )
    expect(result.ueNumeracy).toBe(false)
    expect(result.missing.map((m) => m.id)).toContain('ue-numeracy')
  })

  it('缺项只返回 id，由 UI 走 i18n', () => {
    const result = checkNZUE(sel(['lang-a-lit-zh:HL']))
    expect(result.missing.every((m) => m.msg === undefined)).toBe(true)
  })
})
