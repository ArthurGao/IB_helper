import type {
  EndorsementTier,
  NceaLevel,
  NceaLevelInfo,
  NceaLevelResult,
  NceaPlan,
} from '../../types/ncea'
import { nceaLevels } from '../../data/ncea'

export interface NceaLevelDeps {
  levels: NceaLevelInfo[]
  /** 证书背书所需的 Merit / Excellence 学分（NZQA：50）。 */
  certificateEndorsementCredits: number
  /** 科目背书所需学分（NZQA：14，且内外各 ≥3）。 */
  courseEndorsementCredits: number
  /** 科目背书所需的最少内部 / 外部评估学分（NZQA：各 3）。 */
  courseEndorsementMinInternal: number
  courseEndorsementMinExternal: number
}

/**
 * 背书阈值来自 NZQA（2026-09-29 核实）：
 * - 证书背书：50 个 Merit（或 M+E）学分 → Merit；50 个 Excellence 学分 → Excellence；
 *   且学分须在该证书等级或以上。
 * - 科目背书：单一学年内 14 个学分 + 内部评估 ≥3 + 外部评估 ≥3。
 */
const defaultDeps: NceaLevelDeps = {
  levels: nceaLevels,
  certificateEndorsementCredits: 50,
  courseEndorsementCredits: 14,
  courseEndorsementMinInternal: 3,
  courseEndorsementMinExternal: 3,
}

/**
 * 估算某一级 NCEA 是否达标，以及能拿到哪一档背书。
 *
 * 重要：2024 起 co-requisite 的 20 学分**不计入**该级的 60 学分，
 * 因此这里把 literacyNumeracy 单独判定，不混进学分总数。
 */
export function calcNceaLevel(
  plan: NceaPlan,
  level: NceaLevel,
  deps: NceaLevelDeps = defaultDeps,
): NceaLevelResult {
  const info = deps.levels.find((l) => l.level === level)
  if (!info) {
    throw new Error(`No level data for NCEA level ${level}`)
  }

  // 「该级或以上」才计入。Level 1 的规则是「任一等级」，数据里用 creditsAtLevel 表达，
  // 判定条件同样是 >= level，对 Level 1 自然等价于「任一等级」。
  const counted = plan.subjects
    .filter((s) => s.level >= level)
    .reduce((sum, s) => sum + s.credits, 0)

  const { literacy, numeracy } = info.coRequisite
  const ln = plan.literacyNumeracy
  const coRequisiteMet =
    ln.readingCredits + ln.writingCredits >= literacy && ln.numeracyCredits >= numeracy

  // 证书背书：Excellence 档只数 Excellence 学分，Merit 档数 M+E 学分。
  const atOrAbove = plan.subjects.filter((s) => s.level >= level)
  const meritOrExcellence = atOrAbove.reduce((sum, s) => sum + (s.meritOrExcellenceCredits ?? 0), 0)
  const excellence = atOrAbove.reduce((sum, s) => sum + (s.excellenceCredits ?? 0), 0)

  const certificateEndorsement: EndorsementTier =
    excellence >= deps.certificateEndorsementCredits
      ? 'excellence'
      : meritOrExcellence >= deps.certificateEndorsementCredits
        ? 'merit'
        : 'none'

  /**
   * 科目背书：单科 14 学分 + 内部 ≥3 + 外部 ≥3。
   * 内/外学分未填时视为未知——不猜，直接不给背书（宁可少报也不虚报）。
   * 官方对部分科目（如 Level 2/3 体育、宗教研究、NZSL 等无外部评估的科目）有豁免，
   * 本估算器不实现豁免，因此对这些科目会偏保守，UI 需说明。
   */
  const subjectEndorsements = plan.subjects
    .filter((s) => {
      if ((s.meritOrExcellenceCredits ?? 0) < deps.courseEndorsementCredits) return false
      return (
        (s.internalCredits ?? 0) >= deps.courseEndorsementMinInternal &&
        (s.externalCredits ?? 0) >= deps.courseEndorsementMinExternal
      )
    })
    .map((s) => s.subjectCode)

  const creditsMet = counted >= info.creditsAtLevel

  return {
    level,
    creditsCounted: counted,
    creditsRequired: info.creditsAtLevel,
    creditsMet,
    coRequisiteMet,
    certificateEndorsement,
    subjectEndorsements,
    awarded: creditsMet && coRequisiteMet,
  }
}
