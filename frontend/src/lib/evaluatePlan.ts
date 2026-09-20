import type {
  DiplomaResult,
  NZUEResult,
  PathwayMatch,
  Plan,
  RuleMessage,
  Scenario,
  SubjectGrade,
  Warning,
} from '../types/ib'
import { subjects } from '../data'
import { checkNZUE, evaluateDiploma, getWarnings, matchPathways, validateStructure } from './ib-rules'
import { toSelection, warningsContextOf } from './plan'
import { examYearOf } from './curriculum'

export interface PlanEvaluation {
  /** 由 dpStartYear + examSession 推出的考试年份；任一缺失时为 undefined。 */
  examYear: number | undefined
  errors: RuleMessage[]
  valid: boolean
  warnings: Warning[]
  pathways: PathwayMatch[]
  ue: NZUEResult
  diploma: Record<Scenario, DiplomaResult>
}

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

export function examYearOfPlan(plan: Plan): number | undefined {
  return plan.dpStartYear !== undefined && plan.examSession !== undefined
    ? examYearOf(plan.dpStartYear, plan.examSession)
    : undefined
}

/**
 * 一个方案的完整评估：结构 → 警告 → 方向 → UE → 文凭（两档情景）。
 *
 * 这是**唯一**的评估入口：选课页、对比页、以后的任何页面都必须走这里。
 * 之前对比页自己拼了一份简化逻辑，结果同一个方案在两页给出互相矛盾的结论
 * （对比页把结构非法的方案算出了总分）。纯函数，无 React 依赖。
 */
export function evaluatePlan(plan: Plan): PlanEvaluation {
  const selection = toSelection(plan)
  const examYear = examYearOfPlan(plan)
  const structure = validateStructure(selection, {
    subjects,
    ...(examYear !== undefined ? { examYear } : {}),
  })
  const context = warningsContextOf(plan, structure.valid)
  // 结构不合法时不给「文凭通过」：官方条件以合法的六门组合为前提。
  const core = {
    tok: plan.tok,
    ee: plan.ee,
    casComplete: plan.casComplete,
    structureValid: structure.valid,
  }
  return {
    examYear,
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
}

/** 总分只在能判定时才给数字；incomplete / 缺附加分时返回 null，由 UI 显示 —。 */
export function displayTotal(result: DiplomaResult): number | null {
  return result.status === 'incomplete' ? null : result.total
}
