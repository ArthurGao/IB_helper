import type { GroupId, Plan, SelectedSubject, Selection, SlotPick, WarningsContext } from '../types/ib'
import { subjects as allSubjects } from '../data'

export function emptyPlan(): Plan {
  return {
    subjects: [],
    slots: [],
    targetPathwayIds: [],
    targetUniversityIds: [],
    grades: { safe: {}, best: {} },
    tok: 'C',
    ee: 'C',
    casComplete: true,
  }
}

/** Plan → 规则引擎吃的 Selection。 */
export function toSelection(plan: Plan): Selection {
  const selection: Selection = {
    subjects: plan.subjects,
    targetPathwayIds: plan.targetPathwayIds,
    targetUniversityIds: plan.targetUniversityIds,
  }
  if (plan.schoolId !== undefined) selection.schoolId = plan.schoolId
  if (plan.dpStartYear !== undefined) selection.dpStartYear = plan.dpStartYear
  return selection
}

/**
 * 警告引擎的上下文。抽成一处，免得选课页与对比页各写一份、
 * 同一方案在两个地方给出不同的警告条数。
 */
export function warningsContextOf(plan: Plan, structureValid: boolean): WarningsContext {
  return {
    targetPathwayIds: plan.targetPathwayIds,
    structureValid,
    ...(plan.nativeLanguageIsEnglish !== undefined
      ? { nativeLanguageIsEnglish: plan.nativeLanguageIsEnglish }
      : {}),
  }
}

/**
 * 槽位是唯一真相：subjects 永远由 slots 派生，免得两者不一致
 * （界面显示一套课、引擎评估另一套课）。
 */
export function subjectsFromSlots(slots: SlotPick[]): SelectedSubject[] {
  return [...slots]
    .sort((a, b) => a.slot - b.slot)
    .map(({ code, level }) => ({ code, level }))
}

/**
 * 只有 subjects（例如旧版分享链接）时，按科目自身的学科组反推槽位：
 * 本组还空着就占本组，否则退到第 6 槽（Group 6 替换位）。
 */
export function slotsFromSubjects(subjects: SelectedSubject[]): SlotPick[] {
  const byCode = new Map(allSubjects.map((s) => [s.code, s]))
  const used = new Set<GroupId>()
  const slots: SlotPick[] = []
  for (const pick of subjects) {
    const subject = byCode.get(pick.code)
    const preferred = subject ? (subject.satisfiesGroups ?? [subject.group]) : []
    const slot = preferred.find((g) => !used.has(g)) ?? ([1, 2, 3, 4, 5, 6] as GroupId[]).find((g) => !used.has(g))
    if (slot === undefined) continue
    used.add(slot)
    slots.push({ slot, code: pick.code, level: pick.level })
  }
  return slots.sort((a, b) => a.slot - b.slot)
}

/** 让 plan.subjects 与 plan.slots 对齐；两者都空时原样返回。 */
export function reconcilePlan(plan: Plan): Plan {
  if (plan.slots.length > 0) {
    return { ...plan, subjects: subjectsFromSlots(plan.slots) }
  }
  if (plan.subjects.length > 0) {
    const slots = slotsFromSubjects(plan.subjects)
    return { ...plan, slots, subjects: subjectsFromSlots(slots) }
  }
  return plan
}
