import type { ExamSession } from '../types/ib'

/**
 * 考试年份。DP 是两年制，但**考哪一年取决于 session**：
 * - 5 月 session（北半球为主）：8/9 月入学 → 第二年后的 5 月 → 入学年 + 2
 * - 11 月 session（新西兰等南半球学校）：年初进入 Year 12 → 次年 11 月 → 入学年 + 1
 *
 * 差这一年会把新旧大纲判反，所以 session 由用户选择，不做推测。
 */
export function examYearOf(dpStartYear: number, session: ExamSession): number {
  return session === 'november' ? dpStartYear + 1 : dpStartYear + 2
}

export type SyllabusVerdict = 'new' | 'old' | 'unknown' | 'not-announced'

/**
 * 某科目对该学生是新大纲还是旧大纲。三种「说不了」的情况分开表达：
 * - 'unknown'       → 家长还没填 DP 入学年份，或还没选考试 session
 * - 'not-announced' → 数据里该科目的首考年份为 null（未公布/未核实）
 *
 * 注意：IB 的「first assessment」写的是 5 月 session 的年份；11 月 session 的考生
 * 在同一年稍晚考试，因此用考试年份与首考年份直接比较仍然成立。
 */
export function syllabusFor(
  dpStartYear: number | undefined,
  firstExams: number | null,
  session: ExamSession | undefined,
): SyllabusVerdict {
  if (dpStartYear === undefined || session === undefined) return 'unknown'
  if (firstExams === null) return 'not-announced'
  return examYearOf(dpStartYear, session) >= firstExams ? 'new' : 'old'
}
