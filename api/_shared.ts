/**
 * api/ 内部共用的小工具。刻意保持零依赖——这两个端点只做 HTTP 代理，
 * 引入 SDK 只会让冷启动变慢、包变大。
 */
export const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
export const JEV_MODEL = 'typesafe-ai/jev'
export const KEY_ENV = 'AI_GATEWAY_API_KEY'

/* ------------------------------------------------------------------ */
/* PII 闸门                                                            */
/* ------------------------------------------------------------------ */

/** PII 键名黑名单，与 frontend/src/lib/ai/redact.ts 保持一致。 */
const BLOCKED = [
  'name', 'firstname', 'lastname', 'fullname', 'dob', 'dateofbirth', 'birthdate',
  'school', 'schoolid', 'email', 'phone', 'address', 'nsn', 'studentid',
]

export function isBlockedKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
  return BLOCKED.some((b) => normalized.includes(b))
}

/**
 * 值里的结构化身份标识。只查键名是不够的——家长的自由提问会把姓名、学校、
 * 邮箱写进 content 这个**值**里，光看键名完全拦不住。
 *
 * 局限要说清楚：正则能可靠识别的只有有固定形状的东西（邮箱、电话、NSN、日期）。
 * **自由文本里的人名与校名无法可靠检测**——中文名尤其没有稳定特征。
 * 因此 UI 必须提示家长不要写姓名，本函数只兜住能兜住的部分。
 */
const VALUE_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  // NZ 电话：02x / 0800 / +64 开头，允许空格与连字符
  { id: 'nz-phone', re: /(?:\+?64|0)[\s-]?[2-9](?:[\s-]?\d){6,9}\b/ },
  // NSN（National Student Number）是 9 位数字
  { id: 'nsn', re: /\b\d{9}\b/ },
  { id: 'date-of-birth', re: /\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/ },
  // 常见的学校名写法（英文），如 "Rangitoto College" / "Kristin School"
  { id: 'school-name', re: /\b[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)*\s+(College|School|Grammar|Academy|High)\b/ },
]

export function findPiiInValue(value: string): string | null {
  for (const { id, re } of VALUE_PATTERNS) {
    if (re.test(value)) return id
  }
  return null
}

/**
 * 服务端最后一道 PII 闸门：键名**和**字符串值都查。
 * 前端脱敏失效或有人直接 POST 时，这里仍会拦下。
 */
export function containsPii(payload: unknown): boolean {
  if (typeof payload === 'string') return findPiiInValue(payload) !== null
  if (payload === null || typeof payload !== 'object') return false
  if (Array.isArray(payload)) return payload.some(containsPii)
  return Object.entries(payload as Record<string, unknown>).some(
    ([key, value]) => isBlockedKey(key) || containsPii(value),
  )
}

/* ------------------------------------------------------------------ */
/* 滥用防护                                                            */
/* ------------------------------------------------------------------ */

/**
 * 这是一个**无鉴权的公开端点**，却持有会计费的 Gateway 密钥。
 * 没有账户系统（v1 明确不做），所以用两道成本相对低的防线：
 * 1. Origin 白名单——挡掉从别的站点或脚本直接打过来的请求；
 * 2. 体积上限——挡掉用超长上下文烧 token 的玩法。
 *
 * 这两道都**不是强鉴权**：Origin 头可以伪造，curl 直接不带 Origin 也能过
 * （见下方 allowMissingOrigin 的说明）。真正的限流需要外部状态存储
 * （Vercel Firewall 限流或 Upstash），属于需要额外决策的基础设施。
 */
export const MAX_MESSAGES = 20
export const MAX_MESSAGE_CHARS = 8_000
export const MAX_TOTAL_CHARS = 24_000

export function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS
  if (configured) return configured.split(',').map((s) => s.trim()).filter(Boolean)
  // 默认只允许自己的生产域名；预览部署需要时把域名加进 ALLOWED_ORIGINS。
  return ['https://ib-helper-gamma.vercel.app']
}

/**
 * 同源校验。浏览器对跨站 fetch 一定会带 Origin，所以这能挡住「别的网页调用我的端点」。
 * 没有 Origin 的请求（curl、服务端脚本）**默认拒绝**——宁可让调试者显式加白名单，
 * 也不要留一个谁都能用的代理。
 */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin') ?? request.headers.get('referer')
  if (!origin) return false
  return allowedOrigins().some((allowed) => origin.startsWith(allowed))
}

export interface SizeCheck {
  ok: boolean
  reason?: string
}

export function checkMessageSize(messages: unknown): SizeCheck {
  if (!Array.isArray(messages)) return { ok: false, reason: 'bad-request' }
  if (messages.length > MAX_MESSAGES) return { ok: false, reason: 'too-many-messages' }
  let total = 0
  for (const message of messages) {
    const content = (message as { content?: unknown })?.content
    if (typeof content !== 'string') return { ok: false, reason: 'bad-request' }
    if (content.length > MAX_MESSAGE_CHARS) return { ok: false, reason: 'message-too-long' }
    total += content.length
  }
  if (total > MAX_TOTAL_CHARS) return { ok: false, reason: 'payload-too-large' }
  return { ok: true }
}

/* ------------------------------------------------------------------ */

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
