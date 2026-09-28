import type { NewQualification } from '../../types/ncea'
import { newQualifications } from '../../data/ncea'

/**
 * 新资格的信息级说明。**刻意不做任何通过/失败判定**——
 * 官方尚未公布科目数、通过规则与评分标尺（截至 2026-09-29 仍属 Tranche 2），
 * 在定稿之前实现评分校验等于编造。
 */
export function describeNewQualification(
  id: NewQualification['id'],
  source: NewQualification[] = newQualifications,
): NewQualification | undefined {
  return source.find((q) => q.id === id)
}

/** 该资格的设计细节是否已足够落地成校验逻辑。当前全部为 false。 */
export function hasPublishedAssessmentRules(qualification: NewQualification): boolean {
  return (
    qualification.status === 'confirmed' &&
    qualification.minSubjects != null &&
    qualification.minSubjectsToPass != null
  )
}
