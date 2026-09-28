import { beforeEach, describe, expect, it } from 'vitest'
import { emptyNceaPlan, useNceaStore } from '../nceaStore'

const store = () => useNceaStore.getState()
beforeEach(() => useNceaStore.setState({ plan: emptyNceaPlan() }))

describe('nceaStore', () => {
  it('同一科目同一级重复录入为覆盖，不是新增', () => {
    store().upsertSubject({ subjectCode: 'english', level: 3, credits: 14 })
    store().upsertSubject({ subjectCode: 'english', level: 3, credits: 18 })
    expect(store().plan.subjects).toEqual([{ subjectCode: 'english', level: 3, credits: 18 }])
  })

  it('同一科目不同级各自独立', () => {
    store().upsertSubject({ subjectCode: 'english', level: 2, credits: 12 })
    store().upsertSubject({ subjectCode: 'english', level: 3, credits: 14 })
    expect(store().plan.subjects).toHaveLength(2)
  })

  it('更新已有科目时保持原位置（否则编辑时行会跳动）', () => {
    store().upsertSubject({ subjectCode: 'english', level: 3, credits: 0 })
    store().upsertSubject({ subjectCode: 'calculus', level: 3, credits: 0 })
    store().upsertSubject({ subjectCode: 'physics', level: 3, credits: 0 })
    // 改中间那门
    store().upsertSubject({ subjectCode: 'calculus', level: 3, credits: 14 })
    expect(store().plan.subjects.map((s) => s.subjectCode)).toEqual([
      'english',
      'calculus',
      'physics',
    ])
    expect(store().plan.subjects[1]?.credits).toBe(14)
  })

  it('读写算术学分可分别更新，互不覆盖', () => {
    store().setLiteracyNumeracy({ readingCredits: 5 })
    store().setLiteracyNumeracy({ writingCredits: 5 })
    expect(store().plan.literacyNumeracy).toEqual({
      readingCredits: 5,
      writingCredits: 5,
      numeracyCredits: 0,
    })
  })

  it('与 IB 的 selectionStore 用不同的 localStorage key，互不干扰', async () => {
    const { useSelectionStore } = await import('../selectionStore')
    expect(useSelectionStore.getState().plan).not.toHaveProperty('literacyNumeracy')
    expect(store().plan).not.toHaveProperty('slots')
  })
})
