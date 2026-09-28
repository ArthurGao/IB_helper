/**
 * AI 层的公共类型。业务代码只认这里的接口，不认任何具体厂商。
 */
import type { LLMTask } from '../../config/ai.config'
import type { ProviderId } from '../../config/llm-providers'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResult {
  text: string
  /** 实际生效的供应商；降级时为最后尝试的那个。 */
  providerId: ProviderId | null
  /** true 表示全部供应商不可用，调用方必须走模板降级。 */
  degraded: boolean
}

export interface LLMRouter {
  run(task: LLMTask, messages: LLMMessage[], opts?: { signal?: AbortSignal }): Promise<LLMResult>
}

/**
 * Jev 的真实形态（2026-09-29 查 Gateway 目录）：
 * 「接受 shared state 与 typed questions，返回 choices、scores、boolean probabilities」。
 * 不是「一个 schema 进、一个对象出」，因此按问题集建模。
 */
export type JevQuestion =
  | { id: string; kind: 'choice'; prompt: string; options: string[] }
  | { id: string; kind: 'score'; prompt: string; min: number; max: number }
  | { id: string; kind: 'boolean'; prompt: string }

export type JevAnswer =
  | { id: string; kind: 'choice'; value: string; confidence: number }
  | { id: string; kind: 'score'; value: number; confidence: number }
  | { id: string; kind: 'boolean'; value: boolean; probability: number }

export interface JevRequest {
  /** 去标识化的共享状态——**绝不含姓名 / 出生日期 / 学校**。 */
  state: Record<string, unknown>
  questions: JevQuestion[]
}

export interface JevResult {
  answers: JevAnswer[]
  degraded: boolean
}
