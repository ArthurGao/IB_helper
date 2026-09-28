import type { LLMTask } from '../../config/ai.config'
import { isAiEnabled } from '../../config/ai.config'
import type { LLMResult } from './types'
import { buildExplainMessages, type ExplainInput } from './explain'

export interface ExplainOptions {
  task?: LLMTask
  endpoint?: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

/**
 * 浏览器侧取解释文本。任何一步不顺——AI 关闭、端点报错、Router 全链路失败——
 * 都返回 degraded=true 且 text 为空，UI 必须显示规则引擎的模板文案。
 */
export async function fetchExplanation(
  input: ExplainInput,
  options: ExplainOptions = {},
): Promise<LLMResult> {
  if (!isAiEnabled()) return { text: '', providerId: null, degraded: true }

  const fetchImpl = options.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(options.endpoint ?? '/api/llm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        task: options.task ?? 'explain',
        messages: buildExplainMessages(input),
      }),
      ...(options.signal ? { signal: options.signal } : {}),
    })
    if (!response.ok) return { text: '', providerId: null, degraded: true }
    const payload = (await response.json()) as Partial<LLMResult>
    if (typeof payload.text !== 'string' || payload.text.length === 0 || payload.degraded) {
      return { text: '', providerId: payload.providerId ?? null, degraded: true }
    }
    return { text: payload.text, providerId: payload.providerId ?? null, degraded: false }
  } catch {
    return { text: '', providerId: null, degraded: true }
  }
}
