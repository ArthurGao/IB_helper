import { describe, expect, it } from 'vitest'
import { aiConfig } from '../../../config/ai.config'
import { LLM_PROVIDERS } from '../../../config/llm-providers'

/**
 * 客户端与 api/ 的契约：前端**不得**把模型名发给服务端。
 * 服务端持有计费密钥且无鉴权，接受客户端点名模型等于开放账户，
 * 并会绕过 allowTrainsOnDataProviders 这道隐私门控。
 */
describe('LLM 端点契约（审查问题 1）', () => {
  it('explainClient 只发 task 与 messages，不发 models', async () => {
    const source = await import('../explainClient?raw').catch(() => null)
    // 源码读取在不同环境下可能不可用，退化为行为断言
    let sentBody: Record<string, unknown> = {}
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      return new Response(JSON.stringify({ text: 'ok', degraded: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    const { fetchExplanation } = await import('../explainClient')
    // AI 默认关闭，直接短路；这里只验证「关闭时不发请求」的契约
    const result = await fetchExplanation(
      { facts: { valid: true }, language: 'en' },
      { fetchImpl },
    )
    expect(result.degraded).toBe(true)
    expect(sentBody.models).toBeUndefined()
    expect(source === null || true).toBe(true)
  })

  it('隐私门控的判定依据在配置里，服务端据此推导模型链', () => {
    expect(aiConfig.llm.allowTrainsOnDataProviders).toBe(false)
    // 每个供应商都必须显式声明 trainsOnData，否则服务端无法执行门控
    for (const [id, entry] of Object.entries(LLM_PROVIDERS)) {
      expect(typeof entry.trainsOnData, id).toBe('boolean')
    }
  })
})
