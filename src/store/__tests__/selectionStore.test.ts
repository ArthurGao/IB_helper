import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_COMPARE, useSelectionStore } from '../selectionStore'
import { emptyPlan } from '../../lib/plan'

const store = () => useSelectionStore.getState()

beforeEach(() => {
  useSelectionStore.setState({ plan: emptyPlan(), saved: [], compareIds: [] })
})

describe('selectionStore', () => {
  it('按槽位选课，并同步出引擎要的 subjects 数组', () => {
    store().pickSubject(1, 'lang-a-lit-en', 'HL')
    store().pickSubject(5, 'math-aa', 'SL')
    expect(store().plan.subjects).toEqual([
      { code: 'lang-a-lit-en', level: 'HL' },
      { code: 'math-aa', level: 'SL' },
    ])
  })

  it('同一槽位再选别的科目 = 替换', () => {
    store().pickSubject(4, 'chemistry', 'HL')
    store().pickSubject(4, 'biology', 'SL')
    expect(store().plan.subjects).toEqual([{ code: 'biology', level: 'SL' }])
  })

  it('点同一门课两次 = 取消选择', () => {
    store().pickSubject(6, 'music', 'SL')
    store().pickSubject(6, 'music', 'SL')
    expect(store().plan.subjects).toEqual([])
  })

  it('切换 HL/SL 不影响槽位', () => {
    store().pickSubject(3, 'history', 'SL')
    store().setLevel('history', 'HL')
    expect(store().plan.slots).toEqual([{ slot: 3, code: 'history', level: 'HL' }])
  })

  it('清空槽位', () => {
    store().pickSubject(2, 'english-b', 'HL')
    store().clearSlot(2)
    expect(store().plan.subjects).toEqual([])
  })

  it('两档情景的预估分互不干扰', () => {
    store().setGrade('safe', 'math-aa', 5)
    store().setGrade('best', 'math-aa', 7)
    expect(store().plan.grades.safe['math-aa']).toBe(5)
    expect(store().plan.grades.best['math-aa']).toBe(7)
  })

  it('保存方案后可删除，删除同时移出对比列表', () => {
    store().pickSubject(1, 'lang-a-lit-en', 'HL')
    const saved = store().savePlan('方案 A')
    store().toggleCompare(saved.id)
    expect(store().compareIds).toEqual([saved.id])
    store().deletePlan(saved.id)
    expect(store().saved).toEqual([])
    expect(store().compareIds).toEqual([])
  })

  it(`对比最多 ${MAX_COMPARE} 套，超出时挤掉最早的`, () => {
    const ids = ['a', 'b', 'c', 'd']
    for (const id of ids) store().toggleCompare(id)
    expect(store().compareIds).toHaveLength(MAX_COMPARE)
    expect(store().compareIds).not.toContain('a')
  })

  it('载入分享来的方案会整体替换当前方案', () => {
    const shared = { ...emptyPlan(), targetPathwayIds: ['medicine'] }
    store().loadPlan(shared)
    expect(store().plan.targetPathwayIds).toEqual(['medicine'])
    store().resetPlan()
    expect(store().plan.targetPathwayIds).toEqual([])
  })
})
