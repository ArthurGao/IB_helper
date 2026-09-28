/**
 * AI 编排入口。X1 阶段只提供「是否可用」与降级出口，
 * 真正的 Jev / LLM 调用在 X5–X7 接入（规格里的里程碑顺序）。
 *
 * 设计约束：任何 UI 都不得直接 import jev/ 或 llm/ 下的实现，
 * 一律经过这里，以便一处关掉整层。
 */
import { aiConfig, isAiEnabled } from '../../config/ai.config'

export interface AiAvailability {
  enabled: boolean
  jev: boolean
  llm: boolean
  /** 关闭原因，用于 UI 解释为什么没有 AI 内容。 */
  reason: 'disabled-by-config' | 'jev-disabled' | 'available'
}

export function aiAvailability(): AiAvailability {
  if (!isAiEnabled()) {
    return { enabled: false, jev: false, llm: false, reason: 'disabled-by-config' }
  }
  return {
    enabled: true,
    jev: aiConfig.jev.enabled,
    llm: true,
    reason: aiConfig.jev.enabled ? 'available' : 'jev-disabled',
  }
}
