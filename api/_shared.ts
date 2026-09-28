/**
 * api/ 内部共用的小工具。刻意保持零依赖——这两个端点只做 HTTP 代理，
 * 引入 SDK 只会让冷启动变慢、包变大。
 */
export const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
export const JEV_MODEL = 'typesafe-ai/jev'
export const KEY_ENV = 'AI_GATEWAY_API_KEY'

/** PII 键名黑名单，与 frontend/src/lib/ai/redact.ts 保持一致。 */
const BLOCKED = [
  'name', 'firstname', 'lastname', 'fullname', 'dob', 'dateofbirth', 'birthdate',
  'school', 'schoolid', 'email', 'phone', 'address', 'nsn', 'studentid',
]

export function isBlockedKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
  return BLOCKED.some((b) => normalized.includes(b))
}

/** 服务端最后一道 PII 闸门：前端脱敏失效时这里仍会拦下。 */
export function containsPii(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false
  if (Array.isArray(payload)) return payload.some(containsPii)
  return Object.entries(payload as Record<string, unknown>).some(
    ([key, value]) => isBlockedKey(key) || containsPii(value),
  )
}

export function degraded(reason: string, status = 503): Response {
  return Response.json({ text: '', answers: [], providerId: null, degraded: true, reason }, { status })
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json()
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}
