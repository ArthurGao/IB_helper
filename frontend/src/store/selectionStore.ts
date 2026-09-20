import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CoreGrade,
  ExamSession,
  GroupId,
  Level,
  Plan,
  SavedPlan,
  Scenario,
  SlotPick,
  SubjectGrade,
} from '../types/ib'
import { emptyPlan } from '../lib/plan'

interface SelectionState {
  plan: Plan
  saved: SavedPlan[]
  /** /compare 上并排的方案 id（最多 3 套，见规格 4.3）。 */
  compareIds: string[]

  setSchool: (schoolId: string | undefined) => void
  setTargetPathways: (ids: string[]) => void
  setTargetUniversities: (ids: string[]) => void
  setDpStartYear: (year: number | undefined) => void
  setExamSession: (session: ExamSession | undefined) => void
  setNativeLanguageIsEnglish: (value: boolean | undefined) => void

  /** 选/换某一「槽位」的科目；同一 code 再点一次 = 取消。 */
  pickSubject: (slot: GroupId, code: string, level: Level) => void
  clearSlot: (slot: GroupId) => void
  setLevel: (code: string, level: Level) => void

  setGrade: (scenario: Scenario, code: string, grade: SubjectGrade) => void
  setTok: (grade: CoreGrade) => void
  setEe: (grade: CoreGrade) => void
  setCasComplete: (value: boolean) => void

  loadPlan: (plan: Plan) => void
  resetPlan: () => void
  savePlan: (name: string) => SavedPlan
  deletePlan: (id: string) => void
  toggleCompare: (id: string) => void
}

export const MAX_COMPARE = 3

function newId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** 槽位 → 科目的映射只服务于 UI 输入；引擎只看 subjects 数组。 */
function readSlots(plan: Plan): SlotPick[] {
  return plan.slots ?? []
}

function writeSlots(plan: Plan, slots: SlotPick[]): Plan {
  return { ...plan, slots, subjects: slots.map(({ code, level }) => ({ code, level })) }
}

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      plan: emptyPlan(),
      saved: [],
      compareIds: [],

      setSchool: (schoolId) => set((s) => ({ plan: { ...s.plan, schoolId } })),
      setTargetPathways: (ids) => set((s) => ({ plan: { ...s.plan, targetPathwayIds: ids } })),
      setTargetUniversities: (ids) =>
        set((s) => ({ plan: { ...s.plan, targetUniversityIds: ids } })),
      setDpStartYear: (dpStartYear) => set((s) => ({ plan: { ...s.plan, dpStartYear } })),
      setExamSession: (examSession) => set((s) => ({ plan: { ...s.plan, examSession } })),
      setNativeLanguageIsEnglish: (nativeLanguageIsEnglish) =>
        set((s) => ({ plan: { ...s.plan, nativeLanguageIsEnglish } })),

      pickSubject: (slot, code, level) =>
        set((s) => {
          const others = readSlots(s.plan).filter((p) => p.slot !== slot && p.code !== code)
          const current = readSlots(s.plan).find((p) => p.slot === slot)
          const slots =
            current?.code === code
              ? others
              : [...others, { slot, code, level }].sort((a, b) => a.slot - b.slot)
          return { plan: writeSlots(s.plan, slots) }
        }),

      clearSlot: (slot) =>
        set((s) => ({ plan: writeSlots(s.plan, readSlots(s.plan).filter((p) => p.slot !== slot)) })),

      setLevel: (code, level) =>
        set((s) => ({
          plan: writeSlots(
            s.plan,
            readSlots(s.plan).map((p) => (p.code === code ? { ...p, level } : p)),
          ),
        })),

      setGrade: (scenario, code, grade) =>
        set((s) => ({
          plan: {
            ...s.plan,
            grades: { ...s.plan.grades, [scenario]: { ...s.plan.grades[scenario], [code]: grade } },
          },
        })),
      setTok: (tok) => set((s) => ({ plan: { ...s.plan, tok } })),
      setEe: (ee) => set((s) => ({ plan: { ...s.plan, ee } })),
      setCasComplete: (casComplete) => set((s) => ({ plan: { ...s.plan, casComplete } })),

      loadPlan: (plan) => set({ plan }),
      resetPlan: () => set({ plan: emptyPlan() }),

      savePlan: (name) => {
        const saved: SavedPlan = {
          ...get().plan,
          id: newId(),
          name,
          savedAt: new Date().toISOString(),
        }
        set((s) => ({ saved: [...s.saved, saved] }))
        return saved
      },

      deletePlan: (id) =>
        set((s) => ({
          saved: s.saved.filter((p) => p.id !== id),
          compareIds: s.compareIds.filter((c) => c !== id),
        })),

      toggleCompare: (id) =>
        set((s) => {
          if (s.compareIds.includes(id)) {
            return { compareIds: s.compareIds.filter((c) => c !== id) }
          }
          return { compareIds: [...s.compareIds, id].slice(-MAX_COMPARE) }
        }),
    }),
    { name: 'ib-selector.plan' },
  ),
)
