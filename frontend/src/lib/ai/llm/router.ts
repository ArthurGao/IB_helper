import type { AiConfig, LLMTask } from '../../../config/ai.config'
import { aiConfig as defaultConfig } from '../../../config/ai.config'
import type { ProviderEntry, ProviderId } from '../../../config/llm-providers'
import { LLM_PROVIDERS } from '../../../config/llm-providers'
import type { LLMMessage, LLMResult } from '../types'
import { callGateway } from './gatewayAdapter'

export interface RouterDeps {
  config: AiConfig
  providers: Record<ProviderId, ProviderEntry>
  /** 读环境变量；服务端注入 process.env，测试注入假值。 */
  readEnv: (name: string) => string | undefined
  fetchImpl?: typeof fetch
}

/**
 * 某个任务的供应商尝试顺序：taskOverrides[task] ?? activeProfile，
 * 然后 primary → fallback 依次。**因隐私门控或缺密钥而不可用的供应商直接跳过。**
 */
export function providerChain(task: LLMTask, deps: RouterDeps): ProviderId[] {
  const { config, providers, readEnv } = deps
  const profileId = config.llm.taskOverrides[task] ?? config.llm.activeProfile
  const profile = config.llm.profiles[profileId]
  const ordered = [profile.primary, ...profile.fallback]

  return ordered.filter((id) => {
    const entry = providers[id]
    if (!entry) return false
    // 隐私门控：默认不允许会拿数据训练的供应商（红线 3）。
    if (entry.trainsOnData && !config.llm.allowTrainsOnDataProviders) return false
    // 没有密钥就等于不可用——静默跳过，不要在这里抛错中断降级链。
    const key = readEnv(entry.keyEnv)
    return typeof key === 'string' && key.length > 0
  })
}

/**
 * LLM 路由。业务代码只认这个接口，永远不认具体厂商。
 * 全链路失败时返回 degraded=true，调用方必须走模板降级——
 * 页面关键路径不依赖任何模型（红线 2）。
 */
export async function runLLM(
  task: LLMTask,
  messages: LLMMessage[],
  deps: RouterDeps,
): Promise<LLMResult> {
  const chain = providerChain(task, deps)
  let lastTried: ProviderId | null = null

  for (const id of chain) {
    const entry = deps.providers[id]
    const apiKey = deps.readEnv(entry.keyEnv)
    if (!apiKey) continue
    lastTried = id
    try {
      const text = await callGateway({
        model: entry.gatewayModel,
        messages,
        apiKey,
        timeoutMs: deps.config.llm.timeoutMs,
        ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
      })
      return { text, providerId: id, degraded: false }
    } catch {
      // 继续尝试下一个供应商；具体错误由服务端日志记录，不外泄给前端。
      continue
    }
  }

  return { text: '', providerId: lastTried, degraded: true }
}

export function makeRouterDeps(
  readEnv: (name: string) => string | undefined,
  over: Partial<RouterDeps> = {},
): RouterDeps {
  return {
    config: defaultConfig,
    providers: LLM_PROVIDERS,
    readEnv,
    ...over,
  }
}
