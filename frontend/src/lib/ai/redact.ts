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

/** 供测试与服务端断言：载荷里不得出现 PII 键。 */
export function containsPii(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false
  if (Array.isArray(payload)) return payload.some(containsPii)
  return Object.entries(payload as Record<string, unknown>).some(
    ([key, value]) => isBlockedKey(key) || containsPii(value),
  )
}
