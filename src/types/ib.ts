/**
 * 规格第 8 节的数据模型 + 规则引擎所需的补充类型。
 * 全项目类型的唯一来源；数据文件 (src/data/*.json) 必须匹配这里的形状。
 */

export type Lang = 'en' | 'zh'
export type L10n = Record<Lang, string>

export type Level = 'HL' | 'SL'
export type GroupId = 1 | 2 | 3 | 4 | 5 | 6
export type MathType = 'AA' | 'AI'

/**
 * 核实状态。规格/CLAUDE.md 要求：标了「必须核实」的数字照实落地并标注，
 * 不得自行编造。JSON 不支持注释，因此用这个字段承载 TODO + 来源。
 */
export interface VerifyNote {
  status: 'verified' | 'unverified'
  sourceUrl: string | null
  note: L10n
}

/** 所有数据文件共有的文件头。 */
export interface DataFileMeta {
  lastVerified: string
  sourceUrl: string
  _verify?: VerifyNote
}

export interface Subject {
  /** 本应用内部标识（非 IB 官方科目代码，避免凭记忆编造官方代码）。 */
  code: string
  name: L10n
  group: GroupId
  levels: Level[]
  /** 跨学科科目，如 ESS = [3,4]、Literature and Performance = [1,6]。 */
  satisfiesGroups?: GroupId[]
  mathType?: MathType
  tags?: string[]
  _verify?: VerifyNote
}

export interface SubjectGroup {
  id: GroupId
  name: L10n
  description: L10n
  exampleSubjectCodes: string[]
}

export type Programme = 'PYP' | 'MYP' | 'DP' | 'CP'

export interface School {
  id: string
  name: L10n
  city: L10n
  programmes: Programme[]
  /** 该校实际开设（可空 = 未知，则显示全量科目）。 */
  offeredSubjectCodes?: string[]
  lastVerified: string
  sourceUrl?: string
  _verify?: VerifyNote
}

export interface University {
  id: string
  name: L10n
  country: 'NZ' | 'AU' | 'UK' | 'US' | string
  /** NZ 均为 24（= University Entrance 的最低总分）。 */
  ibMinPoints: number
  notes?: L10n
  /** 规格要求必填；尚未取得官方 IB 入学页面时置 null 并在 _verify 中说明。 */
  sourceUrl: string | null
  lastVerified: string
  _verify?: VerifyNote
}

export interface Pathway {
  id: string
  name: L10n
  /** 科目 code，或 `tag:<tag>` 形式的标签匹配。 */
  requiredHL: string[]
  recommendedHL: string[]
  note: L10n
}

export interface SelectedSubject {
  code: string
  level: Level
}

export interface Selection {
  subjects: SelectedSubject[]
  schoolId?: string
  targetPathwayIds: string[]
  targetUniversityIds: string[]
  dpStartYear?: number
}

/* ------------------------------------------------------------------ */
/* 规则引擎                                                            */
/* ------------------------------------------------------------------ */

export type Severity = 'high' | 'medium' | 'low'

export interface LocalizedMsg {
  id: string
  msg: L10n
  severity?: Severity
}

/** 7.1 validateStructure */
export interface StructureResult {
  valid: boolean
  errors: LocalizedMsg[]
}

/** 科目成绩：1–7，或 N（未提交）。 */
export type SubjectGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'N'
/** TOK / EE 成绩：A–E，或 N（未提交）。 */
export type CoreGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'N'

export interface SubjectGradeEntry {
  code: string
  level: Level
  grade: SubjectGrade
}

/**
 * 文凭失败条件的判定类型。阈值全部来自 diploma-rules.json，
 * 这里只定义「怎么判」，不含任何硬编码数字。
 */
export type DiplomaConditionType =
  | 'cas-complete'
  | 'min-total'
  | 'no-n-grade'
  | 'no-core-e'
  | 'no-core-n'
  | 'no-grade-1'
  | 'max-grade-2-count'
  | 'max-grade-3-or-below-count'
  | 'min-hl-points'
  | 'min-sl-points'

export interface DiplomaCondition {
  id: string
  type: DiplomaConditionType
  /** 单一阈值（如 min-total = 24）。未核实时为 null。 */
  threshold?: number | null
  /** 按 HL/SL 门数区分的阈值，键为 SL 门数（如 "3": 9）。未核实时值为 null。 */
  thresholdBySlCount?: Record<string, number | null>
  /** 计算 HL 分时取最高的 N 门（4 门 HL 时取最高 3 门）。 */
  bestOf?: number
  msg: L10n
  _verify?: VerifyNote
}

export interface DiplomaRules extends DataFileMeta {
  maxPoints: number
  passMark: number
  conditions: DiplomaCondition[]
}

export type ConditionStatus = 'passed' | 'failed' | 'unverified'

export interface ConditionResult {
  id: string
  /** 便于 UI 亮灯；unverified 时为 false，请优先读 status。 */
  passed: boolean
  status: ConditionStatus
  msg: L10n
}

export interface DiplomaResult {
  /** 三态：未核实的阈值/矩阵不会被当成「通过」或「不及格」。 */
  status: 'pass' | 'fail' | 'indeterminate'
  passed: boolean
  conditions: ConditionResult[]
  /** 6 门科目分之和（含 N 时为 null）。 */
  subjectPoints: number | null
  /** TOK/EE 附加分 0–3；矩阵未核实或触发失败时为 null。 */
  coreBonus: number | null
  /** subjectPoints + coreBonus，任一为 null 时为 null。 */
  total: number | null
  max: number
  /** 因缺少已核实数据而无法判定的条件 id。 */
  unverified: string[]
}

/** TOK/EE 矩阵单元格：附加分、'FAIL'（矩阵判失败）、或 null（未核实）。 */
export type TokEeCell = number | 'FAIL' | null

export interface TokEeMatrix extends DataFileMeta {
  /** matrix[TOK 成绩][EE 成绩] */
  matrix: Record<string, Record<string, TokEeCell>>
}

/** 7.3 getWarnings：规则的 when 条件。新增规则只改 JSON，不改代码。 */
export interface WarningWhen {
  targetPathwayIn?: string[]
  mathCourse?: MathType
  mathLevel?: Level
  hlCountIn?: number[]
  /** 所选 HL 同时包含这些科目 code 才命中。 */
  hlSubjectsAll?: string[]
  /** 目标方向所需但缺失的 HL 中，包含其中任一 code 即命中。 */
  missingHlAny?: string[]
  /** 已选科目（任一 level）包含这些 code 才命中。 */
  subjectsAll?: string[]
  subjectsAny?: string[]
  nativeLanguageIsEnglish?: boolean
  /** Group 1 选的是英语科目。 */
  englishInGroup1?: boolean
  /** NZ UE 读写+算术是否满足。 */
  ueLiteracyNumeracy?: boolean
  /** 结构是否合法。 */
  structureValid?: boolean
}

export interface WarningRule {
  id: string
  when: WarningWhen
  severity: Severity
  msg: L10n
}

export interface WarningsRulesFile extends DataFileMeta {
  rules: WarningRule[]
}

export interface WarningsContext {
  targetPathwayIds?: string[]
  nativeLanguageIsEnglish?: boolean
  structureValid?: boolean
}

export interface Warning {
  id: string
  severity: Severity
  msg: L10n
}

/** 7.4 matchPathways */
export type PathwayStatus = 'open' | 'at-risk' | 'closed'

export interface PathwayMatch {
  pathwayId: string
  name: L10n
  status: PathwayStatus
  requiredMet: string[]
  requiredMissing: string[]
  recommendedMet: string[]
  recommendedMissing: string[]
  note: L10n
}

/** 7.5 checkNZUE */
export interface NZUEResult {
  ueLiteracy: boolean
  ueNumeracy: boolean
  ueLiteracyNumeracy: boolean
  missing: LocalizedMsg[]
}
