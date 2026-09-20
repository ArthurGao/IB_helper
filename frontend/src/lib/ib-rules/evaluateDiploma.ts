import type {
  ConditionResult,
  ConditionStatus,
  CoreGrade,
  DiplomaCondition,
  DiplomaConditionType,
  DiplomaResult,
  DiplomaRules,
  SubjectGradeEntry,
  TokEeMatrix,
} from '../../types/ib'
import { diplomaRules as defaultRules, tokEeMatrix as defaultMatrix } from '../../data'

export interface DiplomaInput {
  grades: SubjectGradeEntry[]
  tok: CoreGrade
  ee: CoreGrade
  casComplete: boolean
  /**
   * 选课结构是否合法（validateStructure 的结果）。
   * 官方失败条件以「合法的六门课组合」为前提：六门重复课、缺 Group 1、没有数学
   * 这类组合即使分数够高也拿不到文凭，所以这里显式接收结构结论，
   * 不传则只按科目数判断。
   */
  structureValid?: boolean
}

export interface DiplomaDeps {
  rules: DiplomaRules
  matrix: TokEeMatrix
}

interface CoreBonus {
  /** 0–3；矩阵未核实时为 null。 */
  points: number | null
  /** 官方矩阵判定为失败。 */
  matrixFail: boolean
  /** 矩阵单元格未核实。 */
  unverified: boolean
}

function numericGrades(grades: SubjectGradeEntry[]): number[] {
  return grades.filter((g): g is SubjectGradeEntry & { grade: number } => typeof g.grade === 'number')
    .map((g) => g.grade)
}

function sumBest(values: number[], bestOf: number): number {
  return [...values].sort((a, b) => b - a).slice(0, bestOf).reduce((a, b) => a + b, 0)
}

/** TOK/EE 附加分：全部来自 tokEeMatrix.json，代码不含任何矩阵数值。 */
export function lookupCoreBonus(tok: CoreGrade, ee: CoreGrade, matrix: TokEeMatrix): CoreBonus {
  if (tok === 'N' || ee === 'N') {
    return { points: null, matrixFail: false, unverified: false }
  }
  const cell = matrix.matrix[tok]?.[ee]
  if (cell === 'FAIL') return { points: null, matrixFail: true, unverified: false }
  if (typeof cell === 'number') return { points: cell, matrixFail: false, unverified: false }
  return { points: null, matrixFail: false, unverified: true }
}

/**
 * 「最低分」类条件在科目没选满时无法判定：再加一门课分数只会变多，
 * 此时报 failed 等于告诉家长「你不及格」，其实只是还没选完。
 * 相对地，「最多几个 2/3」这类上限条件即使没选满也已经被违反，照常判 failed。
 */
const MINIMUM_CONDITIONS: DiplomaConditionType[] = ['min-total', 'min-hl-points', 'min-sl-points']

function evaluateCondition(
  condition: DiplomaCondition,
  input: DiplomaInput,
  total: number | null,
  isComplete: boolean,
): ConditionStatus {
  if (!isComplete && MINIMUM_CONDITIONS.includes(condition.type)) return 'unverified'

  const numeric = numericGrades(input.grades)
  const hasN = input.grades.some((g) => g.grade === 'N')

  switch (condition.type) {
    case 'cas-complete':
      return input.casComplete ? 'passed' : 'failed'

    case 'min-total': {
      const threshold = condition.threshold
      if (threshold === null || threshold === undefined) return 'unverified'
      if (total === null) return 'unverified'
      return total >= threshold ? 'passed' : 'failed'
    }

    case 'no-n-grade':
      return hasN ? 'failed' : 'passed'

    case 'no-core-n':
      return input.tok === 'N' || input.ee === 'N' ? 'failed' : 'passed'

    case 'no-core-e':
      return input.tok === 'E' || input.ee === 'E' ? 'failed' : 'passed'

    case 'no-grade-1':
      return numeric.includes(1) ? 'failed' : 'passed'

    case 'max-grade-2-count': {
      const threshold = condition.threshold
      if (threshold === null || threshold === undefined) return 'unverified'
      return numeric.filter((g) => g === 2).length <= threshold ? 'passed' : 'failed'
    }

    case 'max-grade-3-or-below-count': {
      const threshold = condition.threshold
      if (threshold === null || threshold === undefined) return 'unverified'
      return numeric.filter((g) => g <= 3).length <= threshold ? 'passed' : 'failed'
    }

    case 'min-hl-points': {
      const threshold = condition.threshold
      if (threshold === null || threshold === undefined) return 'unverified'
      const hl = input.grades.filter((g) => g.level === 'HL')
      const bestOf = condition.bestOf ?? 3
      // 有 N 的 HL 无法计分；由 no-n-grade 条件去判失败，这里如实报「无法判定」。
      if (hl.some((g) => g.grade === 'N') || hl.length < bestOf) return 'unverified'
      return sumBest(numericGrades(hl), bestOf) >= threshold ? 'passed' : 'failed'
    }

    case 'min-sl-points': {
      const sl = input.grades.filter((g) => g.level === 'SL')
      const threshold = condition.thresholdBySlCount?.[String(sl.length)]
      if (threshold === null || threshold === undefined) return 'unverified'
      if (sl.some((g) => g.grade === 'N')) return 'unverified'
      return numericGrades(sl).reduce((a, b) => a + b, 0) >= threshold ? 'passed' : 'failed'
    }

    default:
      return 'unverified'
  }
}

/**
 * 7.2 文凭 / 失败条件。
 * 所有阈值来自 diploma-rules.json，TOK/EE 附加分来自 tokEeMatrix.json。
 *
 * 三条「绝不撒谎」的规则：
 * 1. 科目数不等于官方要求（6 门）时返回 'incomplete'——官方失败条件以 6 门为前提，
 *    拿 5 门去套会算出「通过」，那是错的；
 * 2. 阈值或矩阵未核实时返回 'indeterminate'，不当成通过；
 * 3. 已经确定不满足某条条件时返回 'fail'，不被 1/2 冲淡。
 */
export function evaluateDiploma(
  input: DiplomaInput,
  deps: DiplomaDeps = { rules: defaultRules, matrix: defaultMatrix },
): DiplomaResult {
  const { rules, matrix } = deps
  const countOk = input.grades.length === rules.requiredSubjectCount
  const structureOk = input.structureValid !== false
  const isComplete = countOk && structureOk

  const hasN = input.grades.some((g) => g.grade === 'N')
  const subjectPoints = hasN ? null : numericGrades(input.grades).reduce((a, b) => a + b, 0)

  const bonus = lookupCoreBonus(input.tok, input.ee, matrix)
  const total = subjectPoints === null || bonus.points === null ? null : subjectPoints + bonus.points

  const conditions: ConditionResult[] = rules.conditions.map((condition) => {
    const status = evaluateCondition(condition, input, total, isComplete)
    return { id: condition.id, status, passed: status === 'passed', msg: condition.msg }
  })

  if (bonus.matrixFail) {
    conditions.push({
      id: 'tok-ee-matrix',
      status: 'failed',
      passed: false,
      msg: matrix.failMsg,
    })
  }

  const unverified = conditions.filter((c) => c.status === 'unverified').map((c) => c.id)
  const failed = conditions.some((c) => c.status === 'failed')
  const status: DiplomaResult['status'] = failed
    ? 'fail'
    : !isComplete
      ? 'incomplete'
      : unverified.length > 0
        ? 'indeterminate'
        : 'pass'

  const incompleteReason: DiplomaResult['incompleteReason'] = countOk ? 'structure' : 'subject-count'

  return {
    status,
    ...(status === 'incomplete' ? { incompleteReason } : {}),
    passed: status === 'pass',
    conditions,
    subjectPoints,
    coreBonus: bonus.points,
    total,
    max: rules.maxPoints,
    unverified,
  }
}
