import type {
  CoreGrade,
  ExamSession,
  Level,
  Plan,
  Scenario,
  SlotPick,
  SubjectGrade,
} from '../types/ib'
import { emptyPlan, reconcilePlan } from './plan'

/**
 * 方案分享：把 Plan 压成 URL-safe base64 放进 ?plan=。
 * 纯前端、无后端，所以链接本身就是数据载体——也因此**链接内容完全不可信**，
 * decodePlan 会逐字段做运行时校验，任何不合法的部分都被丢弃而不是灌进 store。
 */
export const SHARE_PARAM = 'plan'

const LEVELS: Level[] = ['HL', 'SL']
const CORE_GRADES: CoreGrade[] = ['A', 'B', 'C', 'D', 'E', 'N']
const EXAM_SESSIONS: ExamSession[] = ['may', 'november']
const MIN_YEAR = 1990
const MAX_YEAR = 2100
const MAX_SUBJECTS = 12
const MAX_CODE_LENGTH = 64

function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromUrlSafe(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  return base64 + padding
}

function encodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodePlan(plan: Plan): string {
  return toUrlSafe(encodeUtf8(JSON.stringify(plan)))
}

/* ------------------------- 运行时校验 ------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function subjectCode(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_CODE_LENGTH
    ? value
    : null
}

function level(value: unknown): Level | null {
  return LEVELS.includes(value as Level) ? (value as Level) : null
}

function grade(value: unknown): SubjectGrade | null {
  if (value === 'N') return 'N'
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
    ? (value as SubjectGrade)
    : null
}

function coreGrade(value: unknown, fallback: CoreGrade): CoreGrade {
  return CORE_GRADES.includes(value as CoreGrade) ? (value as CoreGrade) : fallback
}

function year(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR
    ? value
    : undefined
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length <= MAX_CODE_LENGTH)
    : []
}

function selectedSubjects(value: unknown): Plan['subjects'] {
  if (!Array.isArray(value)) return []
  const out: Plan['subjects'] = []
  for (const item of value.slice(0, MAX_SUBJECTS)) {
    if (!isRecord(item)) continue
    const code = subjectCode(item.code)
    const lvl = level(item.level)
    if (code && lvl) out.push({ code, level: lvl })
  }
  return out
}

function slots(value: unknown): SlotPick[] {
  if (!Array.isArray(value)) return []
  const out: SlotPick[] = []
  for (const item of value.slice(0, MAX_SUBJECTS)) {
    if (!isRecord(item)) continue
    const code = subjectCode(item.code)
    const lvl = level(item.level)
    const slot = item.slot
    const validSlot =
      typeof slot === 'number' && Number.isInteger(slot) && slot >= 1 && slot <= 6
    if (code && lvl && validSlot) out.push({ slot: slot as SlotPick['slot'], code, level: lvl })
  }
  return out
}

function grades(value: unknown): Record<string, SubjectGrade> {
  if (!isRecord(value)) return {}
  const out: Record<string, SubjectGrade> = {}
  for (const [code, raw] of Object.entries(value)) {
    const key = subjectCode(code)
    const parsed = grade(raw)
    if (key && parsed !== null) out[key] = parsed
  }
  return out
}

/**
 * 解析分享链接里的方案。解析失败返回 null；能解析但字段有问题时，
 * 只保留通过校验的部分并补上默认值——绝不把未经检查的对象交给 UI。
 */
export function decodePlan(encoded: string): Plan | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeUtf8(fromUrlSafe(encoded)))
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (!Array.isArray(parsed.subjects)) return null

  const base = emptyPlan()
  const rawGrades = isRecord(parsed.grades) ? parsed.grades : {}
  const scenarios: Record<Scenario, Record<string, SubjectGrade>> = {
    safe: grades(rawGrades.safe),
    best: grades(rawGrades.best),
  }

  const plan: Plan = {
    ...base,
    subjects: selectedSubjects(parsed.subjects),
    slots: slots(parsed.slots),
    targetPathwayIds: stringList(parsed.targetPathwayIds),
    targetUniversityIds: stringList(parsed.targetUniversityIds),
    grades: scenarios,
    tok: coreGrade(parsed.tok, base.tok),
    ee: coreGrade(parsed.ee, base.ee),
    casComplete: typeof parsed.casComplete === 'boolean' ? parsed.casComplete : base.casComplete,
  }

  const schoolId = subjectCode(parsed.schoolId)
  if (schoolId) plan.schoolId = schoolId
  const dpStartYear = year(parsed.dpStartYear)
  if (dpStartYear !== undefined) plan.dpStartYear = dpStartYear
  if (EXAM_SESSIONS.includes(parsed.examSession as ExamSession)) {
    plan.examSession = parsed.examSession as ExamSession
  }
  if (typeof parsed.nativeLanguageIsEnglish === 'boolean') {
    plan.nativeLanguageIsEnglish = parsed.nativeLanguageIsEnglish
  }

  // 链接里 subjects 与 slots 可能被人为改成两套不同的课；以槽位为准强制对齐，
  // 否则界面显示一套、规则引擎评估另一套。
  return reconcilePlan(plan)
}

export function planShareUrl(plan: Plan, origin: string, pathname = '/selector'): string {
  return `${origin}${pathname}?${SHARE_PARAM}=${encodePlan(plan)}`
}

export function readPlanFromSearch(search: string): Plan | null {
  const encoded = new URLSearchParams(search).get(SHARE_PARAM)
  return encoded ? decodePlan(encoded) : null
}
