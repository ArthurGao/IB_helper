import type { Plan } from '../types/ib'

/**
 * 极简本地埋点（规格 10-P2）：只写 localStorage，**不出网**，
 * 用来看最常见的方向与科目组合，帮助迭代内容。
 */
const STORAGE_KEY = 'ib-selector.stats'
const SEEN_KEY = 'ib-selector.stats.seen'
/** 去重记录的上限，避免 localStorage 无限膨胀。 */
const MAX_SEEN = 200

export interface LocalStats {
  plans: number
  pathways: Record<string, number>
  subjects: Record<string, number>
}

export function emptyStats(): LocalStats {
  return { plans: 0, pathways: {}, subjects: {} }
}

export function readStats(storage: Storage | undefined = safeStorage()): LocalStats {
  if (!storage) return emptyStats()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyStats()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return emptyStats()
    return { ...emptyStats(), ...(parsed as Partial<LocalStats>) }
  } catch {
    return emptyStats()
  }
}

export function tally(stats: LocalStats, plan: Plan): LocalStats {
  const next: LocalStats = {
    plans: stats.plans + 1,
    pathways: { ...stats.pathways },
    subjects: { ...stats.subjects },
  }
  for (const id of plan.targetPathwayIds) next.pathways[id] = (next.pathways[id] ?? 0) + 1
  for (const pick of plan.subjects) {
    const key = `${pick.code}:${pick.level}`
    next.subjects[key] = (next.subjects[key] ?? 0) + 1
  }
  return next
}

/**
 * 方案签名：只看「科目 + 层级 + 目标方向」。
 * 调分数、改 TOK/EE/CAS 不会产生新签名——否则反复编辑的用户会把统计彻底带偏。
 */
export function planSignature(plan: Plan): string {
  const subjects = plan.subjects
    .map((pick) => `${pick.code}:${pick.level}`)
    .sort()
    .join(',')
  const pathways = [...plan.targetPathwayIds].sort().join(',')
  return `${subjects}|${pathways}`
}

function readSeen(storage: Storage | undefined): string[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SEEN_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * 记一次方案。同一签名只记第一次，所以「最常见的方向/组合」统计的是
 * 真实出现过的不同组合，而不是某个用户改了多少次滑块。
 */
export function recordPlan(plan: Plan, storage: Storage | undefined = safeStorage()): LocalStats {
  const signature = planSignature(plan)
  const seen = readSeen(storage)
  if (seen.includes(signature)) return readStats(storage)

  const next = tally(readStats(storage), plan)
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next))
    storage?.setItem(SEEN_KEY, JSON.stringify([...seen, signature].slice(-MAX_SEEN)))
  } catch {
    // 隐私模式下 localStorage 可能不可写——埋点失败不该影响主流程。
  }
  return next
}

export function clearStats(storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY)
    storage?.removeItem(SEEN_KEY)
  } catch {
    // 同上
  }
}

function safeStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}
