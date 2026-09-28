import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LiteracyNumeracyEntry, NceaLevel, NceaPlan, NceaSubjectEntry } from '../types/ncea'

/**
 * NCEA 计划状态。与 IB 的 selectionStore 完全独立——增量以兄弟模块插入，
 * 不改动已完成的 IB 部分（增量规格 §0 红线 4）。
 */
interface NceaState {
  plan: NceaPlan
  setYearLevel: (yearLevel: number | undefined) => void
  setCalendarYear: (year: number | undefined) => void
  upsertSubject: (entry: NceaSubjectEntry) => void
  removeSubject: (subjectCode: string, level: NceaLevel) => void
  setLiteracyNumeracy: (value: Partial<LiteracyNumeracyEntry>) => void
  setNceaLevel3Awarded: (value: boolean | undefined) => void
  resetPlan: () => void
  loadPlan: (plan: NceaPlan) => void
}

export function emptyNceaPlan(): NceaPlan {
  return {
    subjects: [],
    literacyNumeracy: { readingCredits: 0, writingCredits: 0, numeracyCredits: 0 },
  }
}

const sameEntry = (a: NceaSubjectEntry, code: string, level: NceaLevel) =>
  a.subjectCode === code && a.level === level

export const useNceaStore = create<NceaState>()(
  persist(
    (set) => ({
      plan: emptyNceaPlan(),

      setYearLevel: (yearLevel) => set((s) => ({ plan: { ...s.plan, yearLevel } })),
      setCalendarYear: (calendarYear) => set((s) => ({ plan: { ...s.plan, calendarYear } })),

      upsertSubject: (entry) =>
        set((s) => {
          const index = s.plan.subjects.findIndex((x) =>
            sameEntry(x, entry.subjectCode, entry.level),
          )
          // 就地替换而不是「删掉再追加」：否则改一次学分这门课就跳到列表末尾，
          // 家长连续编辑时行会在手底下乱跳。
          const subjects =
            index === -1
              ? [...s.plan.subjects, entry]
              : s.plan.subjects.map((x, i) => (i === index ? entry : x))
          return { plan: { ...s.plan, subjects } }
        }),

      removeSubject: (subjectCode, level) =>
        set((s) => ({
          plan: { ...s.plan, subjects: s.plan.subjects.filter((x) => !sameEntry(x, subjectCode, level)) },
        })),

      setLiteracyNumeracy: (value) =>
        set((s) => ({
          plan: { ...s.plan, literacyNumeracy: { ...s.plan.literacyNumeracy, ...value } },
        })),

      setNceaLevel3Awarded: (nceaLevel3Awarded) =>
        set((s) => ({ plan: { ...s.plan, nceaLevel3Awarded } })),

      resetPlan: () => set({ plan: emptyNceaPlan() }),
      loadPlan: (plan) => set({ plan }),
    }),
    { name: 'ib-selector.ncea' },
  ),
)
