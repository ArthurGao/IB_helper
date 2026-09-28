/**
 * Jev 代理端点（Vercel Function）。
 *
 * Jev = TypeSafe AI 的 System One 评估模型（Gateway id `typesafe-ai/jev`，2026-09-29 实测）：
 * 接受 shared state + typed questions，返回 choices / scores / boolean probabilities。
 * 限制：单次请求总计 64k token，state + 最长问题 ≤ 32k，不支持流式。
 *
 * 只对**已通过规则校验**的组合打分——能不能，永远由规则引擎说了算。
 */
import { GATEWAY_URL, JEV_MODEL, KEY_ENV, containsPii, degraded, readJson } from './_shared.js'

interface JevRequestBody {
  state?: unknown
  questions?: unknown
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return degraded('method-not-allowed', 405)

    const body = (await readJson(request)) as JevRequestBody | null
    if (!body || !Array.isArray(body.questions) || body.questions.length === 0) {
      return degraded('bad-request', 400)
    }
    // PII 闸门排在密钥检查之前：安全检查不该依赖是否配了密钥。
    if (containsPii(body.state)) return degraded('payload-contains-pii', 400)

    const apiKey = process.env[KEY_ENV]
    if (!apiKey) return degraded('missing-api-key')

    try {
      const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: JEV_MODEL,
          state: body.state ?? {},
          questions: body.questions,
        }),
      })
      if (!response.ok) return degraded(`gateway-${response.status}`)
      const payload = (await response.json()) as { answers?: unknown }
      if (!Array.isArray(payload.answers)) return degraded('unexpected-response-shape')
      return Response.json({ answers: payload.answers, degraded: false })
    } catch {
      return degraded('gateway-unreachable')
    }
  },
}
