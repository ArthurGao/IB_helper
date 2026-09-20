import { describe, expect, it } from 'vitest'
import type { Pathway } from '../../../types/ib'
import { pathways, subjects } from '../../../data'
import { matchPathways } from '../matchPathways'
import { BASELINE, sel } from './fixtures'

const find = (matches: ReturnType<typeof matchPathways>, id: string) =>
  matches.find((m) => m.pathwayId === id)

describe('matchPathways', () => {
  it('通用方向数据里没有 requiredHL——工具不会把「建议」说成「必需」', () => {
    for (const pathway of pathways) {
      expect(pathway.requiredHL, `${pathway.id} 不应有 requiredHL`).toEqual([])
    }
  })

  it('医学：缺 HL 生物 → 部分符合，并指出缺哪门（走推荐项）', () => {
    const matches = matchPathways(sel(BASELINE), ['medicine'])
    const medicine = find(matches, 'medicine')
    expect(medicine?.status).toBe('partial')
    expect(medicine?.recommendedMet).toEqual(['chemistry'])
    expect(medicine?.recommendedMissing).toEqual(['biology'])
    expect(medicine?.requiredMissing).toEqual([])
  })

  it('若将来有「已核实的必需项」，缺失时仍返回 not-met', () => {
    const verifiedPathway: Pathway = {
      id: 'verified-example',
      name: { en: 'Example', zh: '示例' },
      requiredHL: ['chemistry'],
      recommendedHL: [],
      note: { en: 'x', zh: 'x' },
    }
    const matches = matchPathways(sel(['biology:HL']), ['verified-example'], {
      subjects,
      pathways: [verifiedPathway],
    })
    expect(find(matches, 'verified-example')?.status).toBe('not-met')
  })

  it('医学：HL 化学 + HL 生物 → 符合通用建议', () => {
    const matches = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'biology:HL', 'math-aa:HL']),
      ['medicine'],
    )
    expect(find(matches, 'medicine')?.status).toBe('meets')
  })

  it('工程：HL 数学 AA + HL 物理 → 符合；换成 AI 则缺推荐项', () => {
    const met = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'physics:HL', 'math-aa:HL', 'visual-arts:HL']),
      ['engineering'],
    )
    expect(find(met, 'engineering')?.status).toBe('meets')

    const partial = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'physics:HL', 'math-ai:HL', 'visual-arts:HL']),
      ['engineering'],
    )
    expect(find(partial, 'engineering')?.recommendedMissing).toContain('math-aa')
    expect(find(partial, 'engineering')?.status).toBe('partial')
  })

  it('计算机：`a|b` 任一满足即可；仍缺 AA 这一推荐项 → 部分符合', () => {
    const matches = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'computer-science:HL', 'math-ai:HL', 'visual-arts:HL']),
      ['cs'],
    )
    const cs = find(matches, 'cs')
    expect(cs?.requiredMissing).toEqual([])
    expect(cs?.recommendedMissing).toEqual(['math-aa'])
    expect(cs?.status).toBe('partial')
  })

  it('理科研究：`tag:science` 用标签匹配任一 HL 理科', () => {
    const matches = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'biology:HL', 'math-aa:HL', 'visual-arts:HL']),
      ['science'],
    )
    expect(find(matches, 'science')?.status).toBe('meets')
  })

  it('无必需项的方向（法律）：无人文 HL 时部分符合，有则符合', () => {
    const noHumanitiesHL = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:SL', 'chemistry:HL', 'math-aa:HL', 'physics:HL']),
      ['law'],
    )
    expect(find(noHumanitiesHL, 'law')?.status).toBe('partial')
    const withHistoryHL = matchPathways(
      sel(['lang-a-lit-en:SL', 'mandarin-b:SL', 'history:HL', 'chemistry:HL', 'math-aa:HL', 'visual-arts:SL']),
      ['law'],
    )
    expect(find(withHistoryHL, 'law')?.status).toBe('meets')
  })

  it('每个方向都带双语名称与「以官网为准」的双语备注', () => {
    const matches = matchPathways(sel(BASELINE), ['medicine', 'engineering'])
    expect(matches).toHaveLength(2)
    for (const match of matches) {
      expect(match.name.zh.length).toBeGreaterThan(0)
      expect(match.name.en.length).toBeGreaterThan(0)
      expect(match.note.zh.length).toBeGreaterThan(0)
      expect(match.note.en.length).toBeGreaterThan(0)
    }
  })

  it('未知方向 id 被忽略', () => {
    expect(matchPathways(sel(BASELINE), ['not-a-pathway'])).toEqual([])
  })

  it('默认读 selection.targetPathwayIds', () => {
    const matches = matchPathways(sel(BASELINE, { targetPathwayIds: ['medicine'] }))
    expect(matches).toHaveLength(1)
  })
})
