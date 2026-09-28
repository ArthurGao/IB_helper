import type {
  NceaPlan,
  UEApprovedSubject,
  UEComponentResult,
  UEResult,
  UeRequirementsFile,
} from '../../types/ncea'
import { ueApprovedSubjects, ueRequirementsFile } from '../../data/ncea'

export interface UEDeps {
  rules: UeRequirementsFile
  approvedSubjects: UEApprovedSubject[]
}

const defaultDeps: UEDeps = {
  rules: ueRequirementsFile,
  approvedSubjects: ueApprovedSubjects,
}

/**
 * UE（University Entrance）检查。四项缺一不可——任一未满足即 ueAwarded=false，
 * 并给出还差多少（gap），这是家长最需要的信息。
 *
 * 所有数值来自 ue-requirements.json（2026-09-29 对 NZQA 核实），引擎内无硬编码阈值。
 * 注意：这里只判 UE 本身；各大学与各专业在 UE 之上另有 rank score 与指定科目要求。
 */
export function checkUniversityEntrance(plan: NceaPlan, deps: UEDeps = defaultDeps): UEResult {
  const { rules, approvedSubjects } = deps
  const approvedCodes = new Set(approvedSubjects.map((s) => s.code))

  // 第一项：必须已取得 NCEA Level 3。
  const level3: UEComponentResult = {
    id: 'ncea-level-3',
    met: plan.nceaLevel3Awarded === true,
    gap: plan.nceaLevel3Awarded === true ? 0 : 1,
  }

  // 第二项：三门认可科目，每门 Level 3 各 14 学分。
  const qualifying = plan.subjects.filter(
    (s) =>
      s.level === 3 && approvedCodes.has(s.subjectCode) && s.credits >= rules.approvedSubjectCredits,
  )
  const subjects: UEComponentResult = {
    id: 'approved-subjects',
    met: qualifying.length >= rules.approvedSubjectCount,
    gap: Math.max(0, rules.approvedSubjectCount - qualifying.length),
    detail: {
      qualifying: qualifying.length,
      required: rules.approvedSubjectCount,
      creditsPerSubject: rules.approvedSubjectCredits,
    },
  }

  // 第三项：读写 10 学分（阅读 ≥5 且写作 ≥5）——两者都不足时缺口取二者之和。
  const { readingCredits, writingCredits, numeracyCredits } = plan.literacyNumeracy
  const readingGap = Math.max(0, rules.literacy.minReading - readingCredits)
  const writingGap = Math.max(0, rules.literacy.minWriting - writingCredits)
  const literacy: UEComponentResult = {
    id: 'ue-literacy',
    met: readingGap === 0 && writingGap === 0,
    gap: readingGap + writingGap,
    detail: {
      reading: readingCredits,
      writing: writingCredits,
      minReading: rules.literacy.minReading,
      minWriting: rules.literacy.minWriting,
      minLevel: rules.literacy.minLevel,
    },
  }

  // 第四项：算术 10 学分。
  const numeracyGap = Math.max(0, rules.numeracy.credits - numeracyCredits)
  const numeracy: UEComponentResult = {
    id: 'ue-numeracy',
    met: numeracyGap === 0,
    gap: numeracyGap,
    detail: {
      credits: numeracyCredits,
      required: rules.numeracy.credits,
      minLevel: rules.numeracy.minLevel,
    },
  }

  const components = [level3, subjects, literacy, numeracy]
  return { ueAwarded: components.every((c) => c.met), components }
}
