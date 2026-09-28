/**
 * LLM 代理端点（Vercel Function）。
 *
 * 为什么必须有服务端：模型密钥绝不能进浏览器。这是 IB v1「纯前端无后端」
 * 的唯一例外，且仅用于代理模型调用——IB 与 NCEA 的规则判定仍在客户端。
 *
 * 签名必须是 `export default { fetch }`：裸的 `export default function handler(req)`
 * 会被运行时当成旧式 (req, res) 处理器，请求直接挂死（见 backend/README.md）。
 */
import { GATEWAY_URL, KEY_ENV, containsPii, degraded, readJson } from './_shared.js'

/**
 * 供应商链由前端配置决定并随请求传入（`frontend/src/config/` 是唯一配置源），
 * 服务端只负责按顺序尝试并保管密钥——这样「改配置即切供应商」才成立。
 */
interface LlmRequest {
  models?: unknown
  messages?: unknown
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return degraded('method-not-allowed', 405)

    const body = (await readJson(request)) as LlmRequest | null
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return degraded('bad-request', 400)
    }
    // 服务端最后一道闸门：前端脱敏失效时也不让 PII 出域。
    // 刻意排在密钥检查之前——安全检查不该依赖是否配了密钥。
    if (containsPii(body.messages)) return degraded('payload-contains-pii', 400)

    const apiKey = process.env[KEY_ENV]
    if (!apiKey) return degraded('missing-api-key')

    const models = Array.isArray(body.models) ? body.models.filter((m) => typeof m === 'string') : []
    if (models.length === 0) return degraded('no-provider-available')

    for (const model of models) {
      try {
        const response = await fetch(GATEWAY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: body.messages }),
        })
        if (!response.ok) continue
        const payload = (await response.json()) as {
          choices?: { message?: { content?: string } }[]
        }
        const text = payload.choices?.[0]?.message?.content
        if (typeof text === 'string' && text.length > 0) {
          return Response.json({ text, providerId: model, degraded: false })
        }
      } catch {
        // 试下一个供应商；具体错误只留在服务端日志里。
        continue
      }
    }

    return degraded('all-providers-failed')
  },
}
