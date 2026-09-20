import { useMemo } from 'react'
import type { Plan } from '../types/ib'
import { subjects } from '../data'
import { evaluatePlan, type PlanEvaluation } from '../lib/evaluatePlan'

const subjectsByCode = new Map(subjects.map((s) => [s.code, s]))

/** evaluatePlan 的 React 包装；真正的规则逻辑在 lib/evaluatePlan.ts。 */
export function usePlanEvaluation(plan: Plan): PlanEvaluation {
  return useMemo(() => evaluatePlan(plan), [plan])
}

export { subjectsByCode }
export type { PlanEvaluation }
export { DEFAULT_GRADE } from '../lib/evaluatePlan'
