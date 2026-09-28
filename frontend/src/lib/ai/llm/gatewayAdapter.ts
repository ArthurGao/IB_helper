import type { LLMMessage } from '../types'

/**
 * 唯一的供应商适配器：Vercel AI Gateway 的 OpenAI 兼容接口。
 * 「切供应商」因此等于换一个模型字符串——不需要为每家厂商写适配器。
 *
 * 只在服务端（api/）调用：密钥从环境变量读，绝不进浏览器。
 */
export const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'

export interface GatewayCall {
  model: string
  messages: LLMMessage[]
  apiKey: string
  timeoutMs: number
  signal?: AbortSignal
  /** 便于测试注入；默认用全局 fetch。 */
  fetchImpl?: typeof fetch
}

export class GatewayError extends Error {
  status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GatewayError'
    this.status = status
  }
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[]
}

/** 单次调用。超时或非 2xx 都抛错，由 Router 决定是否走 fallback。 */
export async function callGateway(call: GatewayCall): Promise<string> {
  const fetchImpl = call.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), call.timeoutMs)
  if (call.signal) {
    call.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetchImpl(`${GATEWAY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${call.apiKey}`,
      },
      body: JSON.stringify({ model: call.model, messages: call.messages }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new GatewayError(`gateway responded ${response.status}`, response.status)
    }

    const payload = (await response.json()) as ChatCompletionResponse
    const text = payload.choices?.[0]?.message?.content
    if (typeof text !== 'string' || text.length === 0) {
      throw new GatewayError('gateway returned no content')
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}
