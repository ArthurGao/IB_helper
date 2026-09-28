import type { NceaPlan, NceaSubjectEntry } from '../../../types/ncea'

export function plan(over: Partial<NceaPlan> = {}): NceaPlan {
  return {
    subjects: [],
    literacyNumeracy: { readingCredits: 0, writingCredits: 0, numeracyCredits: 0 },
    ...over,
  }
}

export function subject(
  subjectCode: string,
  level: 1 | 2 | 3,
  credits: number,
  over: Partial<NceaSubjectEntry> = {},
): NceaSubjectEntry {
  return { subjectCode, level, credits, ...over }
}

/** 刚好满足 UE 的方案：三门认可科目各 14 个 L3 学分 + 读写 5/5 + 算术 10 + 已获 L3。 */
export function uePassingPlan(): NceaPlan {
  return plan({
    nceaLevel3Awarded: true,
    subjects: [
      subject('english', 3, 14),
      subject('calculus', 3, 14),
      subject('physics', 3, 14),
    ],
    literacyNumeracy: { readingCredits: 5, writingCredits: 5, numeracyCredits: 10 },
  })
}
