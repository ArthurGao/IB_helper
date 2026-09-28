import type { JevAnswer, JevRequest, JevResult } from '../types'
import { containsPii } from '../redact'

export interface JevCallOptions {
  endpoint?: string
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

interface JevApiResponse {
  answers?: JevAnswer[]
  degraded?: boolean
}

/**
 * 浏览器侧调用 Jev 的唯一入口——经自家 `api/jev`，绝不直连模型（密钥在服务端）。
 *
 * 发送前**硬性断言载荷无 PII**：这里 throw 比把未成年人信息发出去要好得多。
 * 任何失败都降级返回 degraded=true，调用方退回规则式排序。
 */
export async function askJev(request: JevRequest, options: JevCallOptions = {}): Promise<JevResult> {
  if (containsPii(request.state)) {
    throw new Error('refusing to send Jev a payload containing PII')
  }

  const fetchImpl = options.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(options.endpoint ?? '/api/jev', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      ...(options.signal ? { signal: options.signal } : {}),
    })
    if (!response.ok) return { answers: [], degraded: true }
    const payload = (await response.json()) as JevApiResponse
    if (!Array.isArray(payload.answers)) return { answers: [], degraded: true }
    return { answers: payload.answers, degraded: payload.degraded === true }
  } catch {
    return { answers: [], degraded: true }
  }
}

/** 从 Jev 的答案里取某个候选的契合分；缺答案时返回 null，由调用方降级。 */
export function fitScoreOf(result: JevResult, candidateId: string): number | null {
  const answer = result.answers.find((a) => a.id === `fit:${candidateId}`)
  return answer && answer.kind === 'score' ? answer.value : null
}
