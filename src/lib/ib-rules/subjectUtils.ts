import type { GroupId, Level, MathType, SelectedSubject, Subject } from '../../types/ib'

export interface ResolvedSubject {
  subject: Subject
  level: Level
  /** 该科目可以覆盖的学科组（跨学科科目为多个）。 */
  coverableGroups: GroupId[]
}

export function indexSubjects(subjects: Subject[]): Map<string, Subject> {
  return new Map(subjects.map((s) => [s.code, s]))
}

export function coverableGroups(subject: Subject): GroupId[] {
  return subject.satisfiesGroups && subject.satisfiesGroups.length > 0
    ? [...subject.satisfiesGroups]
    : [subject.group]
}

/** 把 Selection 里的 code/level 解析成完整科目；未知 code 会被跳过。 */
export function resolveSelection(
  selected: SelectedSubject[],
  byCode: Map<string, Subject>,
): ResolvedSubject[] {
  const resolved: ResolvedSubject[] = []
  for (const item of selected) {
    const subject = byCode.get(item.code)
    if (!subject) continue
    resolved.push({ subject, level: item.level, coverableGroups: coverableGroups(subject) })
  }
  return resolved
}

export function isMath(subject: Subject): boolean {
  return subject.group === 5 || subject.mathType !== undefined
}

export function mathTypeOf(resolved: ResolvedSubject[]): MathType | undefined {
  return resolved.find((r) => isMath(r.subject))?.subject.mathType
}

export function mathLevelOf(resolved: ResolvedSubject[]): Level | undefined {
  return resolved.find((r) => isMath(r.subject))?.level
}

export function covers(resolved: ResolvedSubject, group: GroupId): boolean {
  return resolved.coverableGroups.includes(group)
}

export function hasTag(subject: Subject, tag: string): boolean {
  return subject.tags?.includes(tag) ?? false
}
