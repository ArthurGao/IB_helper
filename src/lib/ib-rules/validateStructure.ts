import type { GroupId, RuleMessage, Selection, StructureResult, Subject } from '../../types/ib'
import { subjects as defaultSubjects } from '../../data'
import { coverableGroups, indexSubjects, isMath, resolveSelection } from './subjectUtils'

export interface StructureDeps {
  subjects: Subject[]
}

const REQUIRED_SUBJECT_COUNT = 6
const ALLOWED_HL_COUNTS = [3, 4]

type GroupCounts = Record<GroupId, number>

function emptyCounts(): GroupCounts {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
}

/**
 * 一门科目可以怎么「占组」：
 * - 普通科目：只能占自己的组；
 * - 跨学科科目（如 ESS = 3+4）：可以同时占两组，也可以只占其中一组
 *   （例如 ESS 当作纯 Group 4，Group 3 另选 History）。
 */
function coverageOptions(subject: Subject): GroupId[][] {
  const groups = coverableGroups(subject)
  if (groups.length <= 1) return [groups]
  return [groups, ...groups.map((g) => [g])]
}

/**
 * 合法的占组结果：
 * - Group 1–5 每组至少覆盖一次；
 * - Group 6 最多覆盖一次（0 次 = 用 Group 1–4 的第二门替换）；
 * - 重复覆盖只允许发生在 Group 1–4（即「第二门」只能来自这四组）。
 */
function countsAreValid(counts: GroupCounts): boolean {
  for (const g of [1, 2, 3, 4, 5] as GroupId[]) {
    if (counts[g] < 1) return false
  }
  if (counts[6] > 1) return false
  if (counts[5] > 1) return false
  return true
}

function hasValidAssignment(optionsPerSubject: GroupId[][][]): boolean {
  const counts = emptyCounts()

  const walk = (index: number): boolean => {
    if (index === optionsPerSubject.length) return countsAreValid(counts)
    const options = optionsPerSubject[index] ?? []
    for (const option of options) {
      for (const g of option) counts[g] += 1
      const ok = walk(index + 1)
      for (const g of option) counts[g] -= 1
      if (ok) return true
    }
    return false
  }

  return walk(0)
}

/** 7.1 合法性校验：纯函数，错误只返回 id，由 UI 走 i18n 翻译。 */
export function validateStructure(
  selection: Selection,
  deps: StructureDeps = { subjects: defaultSubjects },
): StructureResult {
  const errors: RuleMessage[] = []
  const byCode = indexSubjects(deps.subjects)
  const picks = selection.subjects

  if (picks.length !== REQUIRED_SUBJECT_COUNT) {
    errors.push({
      id: 'subject-count',
      params: { expected: REQUIRED_SUBJECT_COUNT, actual: picks.length },
    })
  }

  const seen = new Set<string>()
  for (const pick of picks) {
    const subject = byCode.get(pick.code)
    if (!subject) {
      errors.push({ id: 'unknown-subject', params: { code: pick.code } })
      continue
    }
    if (seen.has(pick.code)) {
      errors.push({ id: 'duplicate-subject', params: { code: pick.code } })
    }
    seen.add(pick.code)
    if (!subject.levels.includes(pick.level)) {
      errors.push({
        id: 'level-not-offered',
        params: { code: pick.code, level: pick.level },
      })
    }
  }

  const resolved = resolveSelection(picks, byCode)

  const hlCount = picks.filter((p) => p.level === 'HL').length
  if (!ALLOWED_HL_COUNTS.includes(hlCount)) {
    errors.push({ id: 'hl-count', params: { actual: hlCount } })
  }

  const mathCount = resolved.filter((r) => isMath(r.subject)).length
  if (mathCount !== 1) {
    errors.push({ id: 'math-count', params: { actual: mathCount } })
  }

  // 只有在 6 门都能解析出来时，占组判定才有意义。
  if (resolved.length === picks.length && picks.length === REQUIRED_SUBJECT_COUNT) {
    const options = resolved.map((r) => coverageOptions(r.subject))
    if (!hasValidAssignment(options)) {
      errors.push({ id: 'group-coverage' })
    }
  }

  return { valid: errors.length === 0, errors }
}
