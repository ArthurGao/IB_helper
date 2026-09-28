/**
 * NCEA 增量的类型定义（IB 的类型在 ./ib.ts，两者互不依赖）。
 * 与 IB 侧一致：所有面向用户的名称用 L10n 双语对象，数据文件带 lastVerified / sourceUrl / _verify。
 */
import type { DataFileMeta, L10n, VerifyNote } from './ib'

export type NceaLevel = 1 | 2 | 3

/** achievement standard 的成绩；unit standard 只有 A / N。 */
export type NceaGrade = 'N' | 'A' | 'M' | 'E'

/** 某一级 NCEA 的结构性事实。 */
export interface NceaLevelInfo {
  level: NceaLevel
  /** 通常对应的年级（11 / 12 / 13）。 */
  typicalYear: number
  /** 该级或以上需要修得的学分数。 */
  creditsAtLevel: number
  /** 允许计入的下一级（低一级）学分上限。 */
  carriedCreditsAllowed: number
  /** 读写与算术 co-requisite（独立于学分总数，是拿任何一级的闸门）。 */
  coRequisite: { literacy: number; numeracy: number; note: L10n }
  name: L10n
  summary: L10n
  _verify?: VerifyNote
}

/** NZQA 认可用于 UE 的科目。 */
export interface UEApprovedSubject {
  code: string
  name: L10n
  _verify?: VerifyNote
}

/** UE 四项要求之一。 */
export interface UERequirement {
  id: 'ncea-level-3' | 'approved-subjects' | 'ue-literacy' | 'ue-numeracy'
  label: L10n
  rule: L10n
  _verify?: VerifyNote
}

/** 改革后的新资格。官方尚未定稿，因此 status 与 _verify 必填。 */
export interface NewQualification {
  id: 'foundational' | 'nzce' | 'nzace'
  name: L10n
  replacesLevel?: NceaLevel
  yearLevel?: number
  /** 官方尚未公布时为 null——不要用规格里的猜测值填。 */
  minSubjects?: number | null
  minSubjectsToPass?: number | null
  gradingScale: L10n
  assessment: L10n
  status: 'confirmed' | 'proposed' | 'tbc'
  sourceUrl: string
  lastVerified: string
  _verify?: VerifyNote
}

export interface ReformMilestone {
  year: number
  event: L10n
  affectsYearLevel?: number
  status: 'confirmed' | 'proposed' | 'tbc'
  _verify?: VerifyNote
}

export interface ComparisonRow {
  dimension: L10n
  ib: L10n
  ncea: L10n
}

/* ------------------------------------------------------------------ */
/* 规则引擎的输入输出                                                   */
/* ------------------------------------------------------------------ */

/** 家长为某一科目填入的预计学分。 */
export interface NceaSubjectEntry {
  /** UE 认可科目的 code，或自定义科目名（非认可科目不计入 UE 三门）。 */
  subjectCode: string
  level: NceaLevel
  /** 该科目在该级预计取得的学分。 */
  credits: number
  /** 其中达到 Merit 或 Excellence 的学分（用于 Merit 档背书估算）。 */
  meritOrExcellenceCredits?: number
  /** 其中达到 Excellence 的学分（Excellence 档背书需单独统计）。 */
  excellenceCredits?: number
  /** 内部评估学分——科目背书要求内外各 ≥3。 */
  internalCredits?: number
  externalCredits?: number
}

/** UE 读写 / 算术的 co-requisite 与 UE 专项学分。 */
export interface LiteracyNumeracyEntry {
  /** UE 读写要求区分阅读与写作。 */
  readingCredits: number
  writingCredits: number
  numeracyCredits: number
}

export interface NceaPlan {
  /** 孩子当前年级（9–13）。 */
  yearLevel?: number
  /** 当前日历年，用于按改革时间线推算。 */
  calendarYear?: number
  subjects: NceaSubjectEntry[]
  literacyNumeracy: LiteracyNumeracyEntry
  /** 是否已取得 NCEA Level 3（UE 第一项）。 */
  nceaLevel3Awarded?: boolean
}

export interface UEComponentResult {
  id: UERequirement['id']
  met: boolean
  /** 差多少；已满足时为 0。 */
  gap: number
  /** 面向 UI 的补充数据（科目数、学分数等），由 UI 翻译成文案。 */
  detail?: Record<string, number | string>
}

export interface UEResult {
  ueAwarded: boolean
  components: UEComponentResult[]
}

/**
 * 背书档位。官方（NZQA，2026-09-29 核实）的**科目背书**含 Achieved 档：
 * 「14 or more credits at Achieved or Merit or Excellence」；
 * **证书背书**只有 Merit / Excellence 两档（各需 50 学分）。
 */
export type EndorsementTier = 'none' | 'achieved' | 'merit' | 'excellence'

export interface NceaLevelResult {
  level: NceaLevel
  creditsCounted: number
  creditsRequired: number
  creditsMet: boolean
  coRequisiteMet: boolean
  /** 证书背书档位。 */
  certificateEndorsement: EndorsementTier
  /** 达到背书的科目 code。 */
  subjectEndorsements: string[]
  awarded: boolean
}

export interface QualificationYearRow {
  year: number
  yearLevel: number
  /** NCEA 某级，或新资格 id，或「未知」。 */
  qualification: 'ncea-1' | 'ncea-2' | 'ncea-3' | NewQualification['id'] | 'unknown'
  note: L10n
  /** 该行依据的时间线条目是否已定稿。 */
  status: 'confirmed' | 'proposed' | 'tbc'
}

/* ------------------------------------------------------------------ */
/* 数据文件形状                                                         */
/* ------------------------------------------------------------------ */

export interface NceaLevelsFile extends DataFileMeta {
  levels: NceaLevelInfo[]
}
export interface UeRequirementsFile extends DataFileMeta {
  requirements: UERequirement[]
  /** UE 三门认可科目各需的最低 Level 3 学分。 */
  approvedSubjectCredits: number
  approvedSubjectCount: number
  literacy: { credits: number; minReading: number; minWriting: number; minLevel: number }
  numeracy: { credits: number; minLevel: number }
}
export interface UeApprovedSubjectsFile extends DataFileMeta {
  subjects: UEApprovedSubject[]
}
export interface ReformTimelineFile extends DataFileMeta {
  milestones: ReformMilestone[]
}
export interface NewQualificationsFile extends DataFileMeta {
  qualifications: NewQualification[]
}
export interface ComparisonFile extends DataFileMeta {
  rows: ComparisonRow[]
}
