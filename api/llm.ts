/**
 * LLM 代理端点（Vercel Function）。
 *
 * 为什么必须有服务端：模型密钥绝不能进浏览器。这是 IB v1「纯前端无后端」
 * 的唯一例外，且仅用于代理模型调用——IB 与 NCEA 的规则判定仍在客户端。
 *
 * 签名必须是 `export default { fetch }`：裸的 `export default function handler(req)`
 * 会被运行时当成旧式 (req, res) 处理器，请求直接挂死（见 backend/README.md）。
 */
import { aiConfig, type LLMTask } from '../frontend/src/config/ai.config.js'
import { LLM_PROVIDERS } from '../frontend/src/config/llm-providers.js'
import {
  GATEWAY_URL,
  KEY_ENV,
  checkMessageSize,
  containsPii,
  degraded,
  originAllowed,
  readJson,
} from './_shared.js'

interface LlmRequest {
  task?: unknown
  messages?: unknown
}

const TASKS: LLMTask[] = ['explain', 'qa', 'summarize', 'reform_narrative']

function isTask(value: unknown): value is LLMTask {
  return typeof value === 'string' && TASKS.includes(value as LLMTask)
}

/**
 * 供应商链在**服务端**从同一份配置推导。
 *
 * 这里刻意不接受客户端传模型名：这是个无鉴权的公开端点且持有计费密钥，
 * 让调用方点名模型等于把账户开放给任何人跑任意（包括最贵的）模型，
 * 同时会绕过 allowTrainsOnDataProviders 这道隐私门控——门控只在客户端执行
 * 就等于没有门控。
 */
function providerChain(task: LLMTask): string[] {
  const profileId = aiConfig.llm.taskOverrides[task] ?? aiConfig.llm.activeProfile
  const profile = aiConfig.llm.profiles[profileId]
  return [profile.primary, ...profile.fallback]
    .map((id) => LLM_PROVIDERS[id])
    .filter((entry) => entry.trainsOnData === false || aiConfig.llm.allowTrainsOnDataProviders)
    .map((entry) => entry.gatewayModel)
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return degraded('method-not-allowed', 405)
    // 公开端点 + 计费密钥：先挡掉不是从本站发起的请求。
    if (!originAllowed(request)) return degraded('origin-not-allowed', 403)

    const body = (await readJson(request)) as LlmRequest | null
    if (!body) return degraded('bad-request', 400)

    const size = checkMessageSize(body.messages)
    if (!size.ok) return degraded(size.reason ?? 'bad-request', 400)

    // PII 闸门排在密钥检查之前：安全检查不该依赖是否配了密钥。
    if (containsPii(body.messages)) return degraded('payload-contains-pii', 400)

    if (!isTask(body.task)) return degraded('unknown-task', 400)

    const apiKey = process.env[KEY_ENV]
    if (!apiKey) return degraded('missing-api-key')

    const models = providerChain(body.task)
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
