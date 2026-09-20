import { useMemo } from 'react'
import type {
  DiplomaResult,
  Plan,
  PathwayMatch,
  NZUEResult,
  RuleMessage,
  Scenario,
  SubjectGrade,
  Warning,
} from '../types/ib'
import { subjects } from '../data'
import { checkNZUE, evaluateDiploma, getWarnings, matchPathways, validateStructure } from '../lib/ib-rules'
import { toSelection, warningsContextOf } from '../lib/plan'

export interface PlanEvaluation {
  errors: RuleMessage[]
  valid: boolean
  warnings: Warning[]
  pathways: PathwayMatch[]
  ue: NZUEResult
  diploma: Record<Scenario, DiplomaResult>
}

const subjectsByCode = new Map(subjects.map((s) => [s.code, s]))

/** 未填分数时的默认估分（中位）。 */
export const DEFAULT_GRADE: SubjectGrade = 4

function gradesFor(plan: Plan, scenario: Scenario) {
  return plan.subjects.map((pick) => ({
    code: pick.code,
    level: pick.level,
    // 未填分数的科目按 4 分（中位）估算，并在 UI 上明确提示这是默认值，
    // 免得空值被当成 0 分而误报「不及格」。
    grade: (plan.grades[scenario][pick.code] ?? DEFAULT_GRADE) as SubjectGrade,
  }))
}

/** 一次性跑完整条规则链：结构 → 警告 → 方向 → UE → 文凭（两档情景）。 */
export function usePlanEvaluation(plan: Plan): PlanEvaluation {
  return useMemo(() => {
    const selection = toSelection(plan)
    const structure = validateStructure(selection)
    const context = warningsContextOf(plan, structure.valid)
    const core = { tok: plan.tok, ee: plan.ee, casComplete: plan.casComplete }
    return {
      errors: structure.errors,
      valid: structure.valid,
      warnings: getWarnings(selection, context),
      pathways: matchPathways(selection, plan.targetPathwayIds),
      ue: checkNZUE(selection),
      diploma: {
        safe: evaluateDiploma({ grades: gradesFor(plan, 'safe'), ...core }),
        best: evaluateDiploma({ grades: gradesFor(plan, 'best'), ...core }),
      },
    }
  }, [plan])
}

export { subjectsByCode }
