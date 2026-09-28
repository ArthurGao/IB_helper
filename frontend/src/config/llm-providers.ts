/**
 * LLM 供应商注册表。
 *
 * ⚠️ 价格、限额、模型阵容变动频繁——这里的每个值都带核实日期，**不要当长期真值**。
 * 业务代码与 Router 不得出现硬编码模型字符串，一律从这里取。
 *
 * 全部 id 于 2026-09-29 用 `GET https://ai-gateway.vercel.sh/v1/models`（无需鉴权）实测核对。
 * 增量规格里写的 `groq/qwen-...`、`groq/llama-3.3-70b-versatile`、`xai/grok-4-fast`
 * 在 Gateway 目录中**不存在**（Gateway 没有 groq owner；grok 的 owner 是 spacexai），
 * 故以实测目录为准。
 */
import type { L10n } from '../types/ib'

export type ProviderId = 'qwen-32b' | 'gemini-flash' | 'llama-70b' | 'gemini-pro'

export interface ProviderEntry {
  /** Gateway 上的 owner。 */
  provider: string
  /** 经 Vercel AI Gateway（OpenAI 兼容）调用；false 表示直连该厂商。 */
  viaGateway: boolean
  /** Gateway 的模型 id，实测存在。 */
  gatewayModel: string
  /** 密钥所在的环境变量名——**只写变量名，绝不写明文密钥**。 */
  keyEnv: string
  /** 该供应商是否会用提交的数据训练；隐私门控据此跳过。 */
  trainsOnData: boolean
  costTier: 'free' | 'cheap' | 'paid'
  /** 每百万 token 的美元价格，实测自 Gateway 目录。 */
  pricePerMTokens: { input: number; output: number }
  contextWindow: number
  /** 中文质量评估——双语解释/答疑的决定因素。 */
  note: L10n
  lastVerified: string
}

export const LLM_PROVIDERS: Record<ProviderId, ProviderEntry> = {
  'qwen-32b': {
    provider: 'alibaba',
    viaGateway: true,
    gatewayModel: 'alibaba/qwen-3-32b',
    keyEnv: 'AI_GATEWAY_API_KEY',
    trainsOnData: false, // verify: Gateway 目录不含该字段，需查阿里云条款
    costTier: 'cheap',
    pricePerMTokens: { input: 0.16, output: 0.64 },
    contextWindow: 128_000,
    note: {
      en: 'Primary for explain/qa: strong Chinese, cheap, supports structured output.',
      zh: 'explain/qa 主力：中文强、便宜、支持结构化输出。',
    },
    lastVerified: '2026-09-29',
  },
  'gemini-flash': {
    provider: 'google',
    viaGateway: true,
    gatewayModel: 'google/gemini-3-flash',
    keyEnv: 'AI_GATEWAY_API_KEY',
    trainsOnData: false, // verify: 仅指经 Gateway 的付费调用；Google AI Studio 免费层会训练
    costTier: 'cheap',
    pricePerMTokens: { input: 0.5, output: 3 },
    contextWindow: 1_000_000,
    note: {
      en: 'Fallback and qa profile: 1M context, reasoning + structured output.',
      zh: '备选与 qa 档：100 万上下文，支持推理与结构化输出。',
    },
    lastVerified: '2026-09-29',
  },
  'llama-70b': {
    provider: 'meta',
    viaGateway: true,
    gatewayModel: 'meta/llama-3.3-70b',
    keyEnv: 'AI_GATEWAY_API_KEY',
    trainsOnData: false, // verify
    costTier: 'cheap',
    pricePerMTokens: { input: 0.72, output: 0.72 },
    contextWindow: 128_000,
    note: {
      en: 'Open-weight fallback; weaker Chinese than Qwen, so not a primary for explain/qa.',
      zh: '开源权重备选；中文弱于 Qwen，不担任 explain/qa 主力。',
    },
    lastVerified: '2026-09-29',
  },
  'gemini-pro': {
    provider: 'google',
    viaGateway: true,
    gatewayModel: 'google/gemini-3.1-pro-preview', // verify: preview 版可能改名或下线
    keyEnv: 'AI_GATEWAY_API_KEY',
    trainsOnData: false, // verify
    costTier: 'paid',
    pricePerMTokens: { input: 2, output: 12 },
    contextWindow: 1_000_000,
    note: {
      en: 'Quality profile only — 12x the output price of Qwen.',
      zh: '仅 quality 档使用——输出价格是 Qwen 的约 12 倍。',
    },
    lastVerified: '2026-09-29',
  },
}

/**
 * Gateway 目录里 input 价格为 0 的语言模型只有少数冷门型号
 * （inclusionai/ling-3.0-flash-sante、poolside/laguna-s-2.1-free、stealth/pixel-canary 等，
 * 2026-09-29 实测），中文质量无保障，因此**不**用作主力。
 * 现方案靠「便宜」而非「免费」控成本：一次解释约 1k token，Qwen 约合 $0.0002。
 */
export const FREE_TIER_NOTE = 'see comment above — no suitable zero-cost model on the Gateway'
