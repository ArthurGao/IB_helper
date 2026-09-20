import type { NZUEResult, RuleMessage, Selection, Subject } from '../../types/ib'
import { subjects as defaultSubjects } from '../../data'
import { covers, hasTag, indexSubjects, resolveSelection } from './subjectUtils'

export interface NZUEDeps {
  subjects: Subject[]
}

/**
 * 7.5 新西兰 UE 读写 / 算术检查。
 * 读写：英语 Language A（HL 或 SL），或英语 Language B（HL）。
 * 算术：任一数学（Group 5）。
 * 注意：完整文凭 + 24 分这一条由 evaluateDiploma 负责，不在此函数内。
 */
export function checkNZUE(
  selection: Selection,
  deps: NZUEDeps = { subjects: defaultSubjects },
): NZUEResult {
  const resolved = resolveSelection(selection.subjects, indexSubjects(deps.subjects))

  const ueLiteracy = resolved.some((r) => {
    if (!hasTag(r.subject, 'english')) return false
    if (covers(r, 1) && hasTag(r.subject, 'language-a')) return true
    return covers(r, 2) && hasTag(r.subject, 'language-b') && r.level === 'HL'
  })

  const ueNumeracy = resolved.some((r) => covers(r, 5))

  const missing: RuleMessage[] = []
  if (!ueLiteracy) missing.push({ id: 'ue-literacy' })
  if (!ueNumeracy) missing.push({ id: 'ue-numeracy' })

  return {
    ueLiteracy,
    ueNumeracy,
    ueLiteracyNumeracy: ueLiteracy && ueNumeracy,
    missing,
  }
}
