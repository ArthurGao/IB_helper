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

/**
 * 某个考试年份区间内该科目提供的层级。
 * 例：ESS 在 2026 年首次评估的新大纲才有 HL，旧大纲考生只能选 SL。
 * `fromExamYear` / `throughExamYear` 均为闭区间，省略表示不设下/上界。
 */
export interface LevelAvailability {
  levels: Level[]
  fromExamYear?: number
  throughExamYear?: number
}

export interface Subject {
  /** 本应用内部标识（非 IB 官方科目代码，避免凭记忆编造官方代码）。 */
  code: string
  name: L10n
  group: GroupId
  /** 未指定考试年份时的层级（= 当前大纲）。 */
  levels: Level[]
  /** 按考试年份变化的层级；给定考试年份时优先于 `levels`。 */
  levelAvailability?: LevelAvailability[]
  /** 该科目最后一次可考的年份（之后被新课程取代）。 */
  availableThroughExamYear?: number
  /** 该科目最早可考的年份。 */
  availableFromExamYear?: number
  /** 跨学科科目，如 ESS = [3,4]、Literature and Performance = [1,6]。 */
  satisfiesGroups?: GroupId[]
  mathType?: MathType
  tags?: string[]
  /** 面向用户的补充说明，例如该科目将被新大纲课程取代。 */
  note?: L10n
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

/**
 * 引擎产出的消息。结构性错误只给 `id`（+ 可选 params），由 UI 用
 * locales 下的 selector 命名空间翻译——避免在引擎里硬编码中/英文案。
 * 数据驱动的文案（警告规则）则直接带 JSON 里的双语 `msg`。
 */
export interface RuleMessage {
  id: string
  params?: Record<string, string | number>
  msg?: L10n
  severity?: Severity
}

/** 7.1 validateStructure */
export interface StructureResult {
  valid: boolean
  errors: RuleMessage[]
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
  /** 文凭要求的科目数；条件判定以此为前提。 */
  requiredSubjectCount: number
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
  /**
   * 四态。除了「未核实不当成通过/不及格」之外，还要把「科目数不对」单独拎出来：
   * 官方失败条件默认考生注册了 6 门课，拿 5 门课去套条件会得出「通过」这种荒谬结论。
   */
  status: 'pass' | 'fail' | 'indeterminate' | 'incomplete'
  /** status 为 incomplete 时说明原因，便于 UI 给出准确文案。 */
  incompleteReason?: 'subject-count' | 'structure'
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
  /** 矩阵判定为失败时展示的双语文案。 */
  failMsg: L10n
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

/**
 * 7.4 matchPathways。
 * 刻意不用 open / closed 这类措辞：本工具比对的是 pathways.json 里的**通用选课建议**，
 * 不是任何一所大学的录取判定（例如新西兰的医学根本不是高中直申）。
 */
export type PathwayStatus = 'meets' | 'partial' | 'not-met'

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
  /** 缺项：`ue-literacy` / `ue-numeracy`，由 UI 翻译。 */
  missing: RuleMessage[]
}

/** /updates 课程改革时间线（规格 9.6）。 */
export interface CurriculumUpdate {
  id: string
  name: L10n
  subjectCodes: string[]
  firstTeaching: number | null
  firstExams: number | null
  note: L10n
}

/* ------------------------------------------------------------------ */
/* 数据文件的整体形状                                                   */
/* ------------------------------------------------------------------ */

export interface SubjectsFile extends DataFileMeta {
  subjects: Subject[]
}
export interface GroupsFile extends DataFileMeta {
  groups: SubjectGroup[]
}
export interface PathwaysFile extends DataFileMeta {
  pathways: Pathway[]
}
export interface UniversitiesFile extends DataFileMeta {
  universities: University[]
}
export interface SchoolsFile extends DataFileMeta {
  schools: School[]
}
export interface CurriculumUpdatesFile extends DataFileMeta {
  updates: CurriculumUpdate[]
}

/* ------------------------------------------------------------------ */
/* 方案（Plan）：选课 + 背景 + 模拟成绩                                  */
/* ------------------------------------------------------------------ */

/** 两档情景：safe = 保底，best = 冲刺。 */
export type Scenario = 'safe' | 'best'

/**
 * IB 有 5 月与 11 月两个考试 session。北半球多为 5 月（入学年 + 2），
 * 新西兰等南半球学校多在 Year 13 的 11 月考（入学年 + 1）——差一年会把新旧大纲判错，
 * 所以这个值由用户选择，不做推测。
 */
export type ExamSession = 'may' | 'november'

/** 选课「槽位」：Group 1–5 对应本组，槽位 6 可放 Group 6 或 Group 1–4 的第二门。 */
export interface SlotPick extends SelectedSubject {
  slot: GroupId
}

export interface Plan {
  subjects: SelectedSubject[]
  /** UI 输入层的槽位记录；引擎只看 subjects。 */
  slots: SlotPick[]
  schoolId?: string
  targetPathwayIds: string[]
  targetUniversityIds: string[]
  dpStartYear?: number
  examSession?: ExamSession
  nativeLanguageIsEnglish?: boolean
  /** 科目 code → 预估分；两档情景各一份。 */
  grades: Record<Scenario, Record<string, SubjectGrade>>
  tok: CoreGrade
  ee: CoreGrade
  casComplete: boolean
}

export interface SavedPlan extends Plan {
  id: string
  name: string
  savedAt: string
}
