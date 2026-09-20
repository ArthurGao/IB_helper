import type {
  Pathway,
  Selection,
  Subject,
  Warning,
  WarningRule,
  WarningWhen,
  WarningsContext,
} from '../../types/ib'
import {
  pathways as defaultPathways,
  subjects as defaultSubjects,
  warningRules as defaultRules,
} from '../../data'
import { checkNZUE } from './checkNZUE'
import { matchPathways } from './matchPathways'
import { validateStructure } from './validateStructure'
import { covers, hasTag, indexSubjects, isMath, resolveSelection } from './subjectUtils'

export interface WarningsDeps {
  subjects: Subject[]
  pathways: Pathway[]
  rules: WarningRule[]
}

/** 从选课 + 上下文算出的「事实」；规则的 when 只与这些事实比对。 */
interface Facts {
  targetPathwayIds: string[]
  mathCourse?: string
  mathLevel?: string
  hlCount: number
  hlCodes: string[]
  allCodes: string[]
  missingHl: string[]
  englishInGroup1: boolean
  nativeLanguageIsEnglish?: boolean
  ueLiteracyNumeracy: boolean
  structureValid: boolean
}

function matches(when: WarningWhen, facts: Facts): boolean {
  if (when.targetPathwayIn && !when.targetPathwayIn.some((p) => facts.targetPathwayIds.includes(p))) {
    return false
  }
  if (when.mathCourse !== undefined && when.mathCourse !== facts.mathCourse) return false
  if (when.mathLevel !== undefined && when.mathLevel !== facts.mathLevel) return false
  if (when.hlCountIn && !when.hlCountIn.includes(facts.hlCount)) return false
  if (when.hlSubjectsAll && !when.hlSubjectsAll.every((c) => facts.hlCodes.includes(c))) return false
  if (when.missingHlAny && !when.missingHlAny.some((c) => facts.missingHl.includes(c))) return false
  if (when.subjectsAll && !when.subjectsAll.every((c) => facts.allCodes.includes(c))) return false
  if (when.subjectsAny && !when.subjectsAny.some((c) => facts.allCodes.includes(c))) return false
  if (when.englishInGroup1 !== undefined && when.englishInGroup1 !== facts.englishInGroup1) return false
  if (
    when.nativeLanguageIsEnglish !== undefined &&
    when.nativeLanguageIsEnglish !== facts.nativeLanguageIsEnglish
  ) {
    return false
  }
  if (
    when.ueLiteracyNumeracy !== undefined &&
    when.ueLiteracyNumeracy !== facts.ueLiteracyNumeracy
  ) {
    return false
  }
  if (when.structureValid !== undefined && when.structureValid !== facts.structureValid) return false
  return true
}

/**
 * 7.3 警告引擎：规则来自 warnings-rules.json，新增规则不改代码
 * （只要 when 用的是已支持的谓词字段，见 WarningWhen）。
 */
export function getWarnings(
  selection: Selection,
  context: WarningsContext = {},
  deps: WarningsDeps = {
    subjects: defaultSubjects,
    pathways: defaultPathways,
    rules: defaultRules,
  },
): Warning[] {
  const resolved = resolveSelection(selection.subjects, indexSubjects(deps.subjects))
  const targetPathwayIds = context.targetPathwayIds ?? selection.targetPathwayIds

  const math = resolved.find((r) => isMath(r.subject))
  const hl = resolved.filter((r) => r.level === 'HL')

  const pathwayMatches = matchPathways(selection, targetPathwayIds, {
    subjects: deps.subjects,
    pathways: deps.pathways,
  })
  // 「缺失的 HL」拆到单个 code，便于 missingHlAny 这类规则直接写科目 code。
  const missingHl = pathwayMatches
    .flatMap((m) => [...m.requiredMissing, ...m.recommendedMissing])
    .flatMap((token) => token.split('|').map((t) => t.trim()))

  const facts: Facts = {
    targetPathwayIds,
    mathCourse: math?.subject.mathType,
    mathLevel: math?.level,
    hlCount: hl.length,
    hlCodes: hl.map((r) => r.subject.code),
    allCodes: resolved.map((r) => r.subject.code),
    missingHl,
    englishInGroup1: resolved.some((r) => covers(r, 1) && hasTag(r.subject, 'english')),
    nativeLanguageIsEnglish: context.nativeLanguageIsEnglish,
    ueLiteracyNumeracy: checkNZUE(selection, { subjects: deps.subjects }).ueLiteracyNumeracy,
    structureValid:
      context.structureValid ?? validateStructure(selection, { subjects: deps.subjects }).valid,
  }

  return deps.rules
    .filter((rule) => matches(rule.when, facts))
    .map((rule) => ({ id: rule.id, severity: rule.severity, msg: rule.msg }))
}
