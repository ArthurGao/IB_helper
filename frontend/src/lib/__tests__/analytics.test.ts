import { describe, expect, it } from 'vitest'
import { emptyStats, tally } from '../analytics'
import { emptyPlan } from '../plan'

const plan = {
  ...emptyPlan(),
  subjects: [
    { code: 'math-aa', level: 'HL' as const },
    { code: 'chemistry', level: 'SL' as const },
  ],
  targetPathwayIds: ['medicine', 'engineering'],
}

describe('本地埋点', () => {
  it('累加方案数、方向与科目组合', () => {
    const once = tally(emptyStats(), plan)
    expect(once.plans).toBe(1)
    expect(once.pathways.medicine).toBe(1)
    expect(once.subjects['math-aa:HL']).toBe(1)

    const twice = tally(once, plan)
    expect(twice.plans).toBe(2)
    expect(twice.pathways.engineering).toBe(2)
    expect(twice.subjects['chemistry:SL']).toBe(2)
  })

  it('不修改传入的统计对象（纯函数）', () => {
    const base = emptyStats()
    tally(base, plan)
    expect(base).toEqual(emptyStats())
  })
})

describe('埋点去重', () => {
  class MemoryStorage {
    private data = new Map<string, string>()
    getItem(key: string): string | null {
      return this.data.get(key) ?? null
    }
    setItem(key: string, value: string): void {
      this.data.set(key, value)
    }
    removeItem(key: string): void {
      this.data.delete(key)
    }
  }

  const storage = () => new MemoryStorage() as unknown as Storage

  it('同一「科目 + 方向」组合只记一次', async () => {
    const { recordPlan, planSignature } = await import('../analytics')
    const store = storage()
    recordPlan(plan, store)
    recordPlan(plan, store)
    recordPlan({ ...plan, grades: { safe: { 'math-aa': 7 }, best: {} }, tok: 'A' }, store)
    const stats = JSON.parse(store.getItem('ib-selector.stats') ?? '{}')
    expect(stats.plans).toBe(1)
    expect(planSignature(plan)).toBe(planSignature({ ...plan, tok: 'A' }))
  })

  it('换了科目才算新方案', async () => {
    const { recordPlan } = await import('../analytics')
    const store = storage()
    recordPlan(plan, store)
    recordPlan({ ...plan, subjects: [{ code: 'physics', level: 'HL' }] }, store)
    const stats = JSON.parse(store.getItem('ib-selector.stats') ?? '{}')
    expect(stats.plans).toBe(2)
  })
})
