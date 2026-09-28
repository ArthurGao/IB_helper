/**
 * AI 层的唯一配置入口。改这里即可切供应商，业务代码零改动。
 *
 * 红线（增量规格 §0）：
 * 1. 权威永远在规则引擎——能否文凭 / UE / 学分达标，绝不经过 Jev 或 LLM；
 * 2. 强制降级——任一模型挂掉，app 退回纯规则模式照常工作；
 * 3. 无 PII 出域——只发去标识化的抽象字段。
 */
import type { ProviderId } from './llm-providers'

export type LLMTask = 'explain' | 'qa' | 'summarize' | 'reform_narrative'
export type ProfileId = 'free' | 'balanced' | 'quality'

export interface LLMProfile {
  primary: ProviderId
  fallback: ProviderId[]
}

export interface AiConfig {
  /** 总开关。关闭时整个 AI 层不加载，app 退回纯规则工具。 */
  enabled: boolean
  jev: {
    enabled: boolean
    viaGateway: boolean
    /** 2026-09-29 实测 id；规格写的 `typesafe/jev` 不存在。 */
    gatewayModel: string
    keyEnv: string
    timeoutMs: number
    /** Jev 单次请求上限：总计 64k token，state + 最长问题 ≤ 32k（官方目录说明，2026-09-29）。 */
    limits: { totalTokens: number; stateTokens: number }
  }
  llm: {
    activeProfile: ProfileId
    profiles: Record<ProfileId, LLMProfile>
    taskOverrides: Partial<Record<LLMTask, ProfileId>>
    timeoutMs: number
    cacheExplanations: boolean
    /** 隐私门控：false 时 Router 跳过 trainsOnData=true 的供应商。 */
    allowTrainsOnDataProviders: boolean
  }
}

export const aiConfig: AiConfig = {
  // X1：默认关闭。AI 关着时 IB + NCEA 必须完整可用（验收标准之一）。
  enabled: false,
  jev: {
    enabled: true,
    viaGateway: true,
    gatewayModel: 'typesafe-ai/jev',
    keyEnv: 'AI_GATEWAY_API_KEY',
    timeoutMs: 2000,
    limits: { totalTokens: 64_000, stateTokens: 32_000 },
  },
  llm: {
    // 「free」档在 Gateway 上没有合适的零成本模型，因此是「最便宜」而非「免费」，
    // 见 llm-providers.ts 末尾的说明。
    activeProfile: 'free',
    profiles: {
      free: { primary: 'qwen-32b', fallback: ['gemini-flash'] },
      balanced: { primary: 'gemini-flash', fallback: ['qwen-32b'] },
      quality: { primary: 'gemini-pro', fallback: ['gemini-flash', 'qwen-32b'] },
    },
    /**
     * 只为**确实需要偏离全局档位**的 task 设覆盖。
     * 规格原本给四个 task 都写了覆盖，那样 activeProfile 永远不生效，
     * 「改一处即全局切换」这条验收标准就成了空话——所以这里只保留 qa：
     * 答疑要处理家长的自由提问，值得用更强的模型。
     */
    taskOverrides: {
      qa: 'balanced',
    },
    timeoutMs: 8000,
    cacheExplanations: true,
    allowTrainsOnDataProviders: false,
  },
}

/** AI 是否可用。任何调用模型的代码都必须先问这个。 */
export function isAiEnabled(): boolean {
  return aiConfig.enabled
}
