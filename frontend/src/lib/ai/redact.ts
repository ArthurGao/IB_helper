/**
 * PII 脱敏（红线 3）。发往任何托管模型的载荷只能含去标识化的抽象字段——
 * 这是未成年人数据，从严处理。
 *
 * 做法是**白名单**而不是黑名单：只有明确允许的键才会被发出去。
 * 黑名单迟早会漏，白名单漏掉只会少发字段，不会泄露。
 */
const BLOCKED_KEYS = [
  'name',
  'firstname',
  'lastname',
  'fullname',
  'dob',
  'dateofbirth',
  'birthdate',
  'school',
  'schoolid',
  'email',
  'phone',
  'address',
  'nsn',
  'studentid',
]

export function isBlockedKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
  return BLOCKED_KEYS.some((blocked) => normalized.includes(blocked))
}

/**
 * 按白名单过滤对象。未列入 allowed 的键一律丢弃；
 * 即使列入了，命中 PII 关键词也丢弃（双保险）。
 */
export function redact<T extends Record<string, unknown>>(
  input: T,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key)) continue
    if (isBlockedKey(key)) continue
    out[key] = value
  }
  return out
}

/**
 * 值里的结构化身份标识。**只查键名是不够的**——家长的自由提问会把邮箱、电话、
 * 学校写进 content 这个「值」里，键名检查完全拦不住。
 *
 * 局限必须说清楚：正则只能可靠识别有固定形状的东西。**自由文本里的人名
 * （尤其是中文名）无法可靠检测**，因此 UI 要明确提示不要填姓名，
 * 这里只兜住能兜住的部分，并与 api/_shared.ts 保持同一套规则。
 */
const VALUE_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { id: 'nz-phone', re: /(?:\+?64|0)[\s-]?[2-9](?:[\s-]?\d){6,9}\b/ },
  { id: 'nsn', re: /\b\d{9}\b/ },
  { id: 'date-of-birth', re: /\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/ },
  {
    id: 'school-name',
    re: /\b[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)*\s+(College|School|Grammar|Academy|High)\b/,
  },
]

export function findPiiInValue(value: string): string | null {
  for (const { id, re } of VALUE_PATTERNS) {
    if (re.test(value)) return id
  }
  return null
}

/** 把能识别的身份标识替换掉，供自由文本（家长提问）在发送前清洗。 */
export function scrubValue(value: string): string {
  let out = value
  for (const { id, re } of VALUE_PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`), `[${id} removed]`)
  }
  return out
}

/** 供测试与服务端断言：载荷里不得出现 PII——键名**与**字符串值都查。 */
export function containsPii(payload: unknown): boolean {
  if (typeof payload === 'string') return findPiiInValue(payload) !== null
  if (payload === null || typeof payload !== 'object') return false
  if (Array.isArray(payload)) return payload.some(containsPii)
  return Object.entries(payload as Record<string, unknown>).some(
    ([key, value]) => isBlockedKey(key) || containsPii(value),
  )
}
