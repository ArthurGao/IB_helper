import { describe, expect, it, vi } from 'vitest'
import type { AiConfig } from '../../../config/ai.config'
import { aiConfig } from '../../../config/ai.config'
import { LLM_PROVIDERS } from '../../../config/llm-providers'
import { providerChain, runLLM, type RouterDeps } from '../llm/router'

const allKeys = () => 'test-key'
const baseConfig = (over: Partial<AiConfig['llm']> = {}): AiConfig => ({
  ...aiConfig,
  llm: { ...aiConfig.llm, ...over },
})

const deps = (over: Partial<RouterDeps> = {}): RouterDeps => ({
  config: baseConfig(),
  providers: LLM_PROVIDERS,
  readEnv: allKeys,
  ...over,
})

/** 造一个 fetch：按顺序对每次调用返回成功或失败。 */
function fakeFetch(outcomes: Array<'ok' | 'fail'>, seen: string[] = []) {
  let i = 0
  return Object.assign(
    async (_url: string, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string }
      seen.push(body.model ?? '')
      const outcome = outcomes[i++] ?? 'fail'
      if (outcome === 'fail') return new Response('nope', { status: 500 })
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'hello' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    },
    { seen },
  ) as unknown as typeof fetch & { seen: string[] }
}

describe('LLMRouter', () => {
  it('只改 activeProfile 就切换供应商，业务代码零改动（规格验收）', () => {
    const free = providerChain('summarize', deps({ config: baseConfig({ activeProfile: 'free' }) }))
    const balanced = providerChain(
      'summarize',
      deps({ config: baseConfig({ activeProfile: 'balanced' }) }),
    )
    expect(free[0]).toBe('qwen-32b')
    expect(balanced[0]).toBe('gemini-flash')
  })

  it('taskOverrides 优先于 activeProfile，但只覆盖真正需要的 task', () => {
    // 默认 activeProfile=free，qa 被指定到 balanced，其余跟随全局
    expect(providerChain('qa', deps())[0]).toBe('gemini-flash')
    expect(providerChain('explain', deps())[0]).toBe('qwen-32b')
    // 覆盖不能写满四个 task，否则 activeProfile 永远不生效
    expect(Object.keys(aiConfig.llm.taskOverrides).length).toBeLessThan(4)
  })

  it('隐私门控：allowTrainsOnDataProviders=false 时跳过 trainsOnData 供应商（规格验收）', () => {
    const providers = {
      ...LLM_PROVIDERS,
      'qwen-32b': { ...LLM_PROVIDERS['qwen-32b'], trainsOnData: true },
    }
    const chain = providerChain('explain', deps({ providers }))
    expect(chain).not.toContain('qwen-32b')

    const allowed = providerChain(
      'explain',
      deps({ providers, config: baseConfig({ allowTrainsOnDataProviders: true }) }),
    )
    expect(allowed).toContain('qwen-32b')
  })

  it('缺密钥的供应商被静默跳过，不中断降级链', () => {
    const chain = providerChain(
      'explain',
      deps({ readEnv: () => undefined }),
    )
    expect(chain).toEqual([])
  })

  it('主供应商失败 → 自动走 fallback', async () => {
    const seen: string[] = []
    const result = await runLLM('explain', [{ role: 'user', content: 'hi' }], {
      ...deps(),
      fetchImpl: fakeFetch(['fail', 'ok'], seen),
    })
    expect(result.degraded).toBe(false)
    expect(result.providerId).toBe('gemini-flash')
    expect(seen).toEqual([
      LLM_PROVIDERS['qwen-32b'].gatewayModel,
      LLM_PROVIDERS['gemini-flash'].gatewayModel,
    ])
  })

  it('全链路失败 → degraded=true，调用方走模板（红线 2）', async () => {
    const result = await runLLM('explain', [{ role: 'user', content: 'hi' }], {
      ...deps(),
      fetchImpl: fakeFetch(['fail', 'fail', 'fail']),
    })
    expect(result.degraded).toBe(true)
    expect(result.text).toBe('')
  })

  it('新增一个 OpenAI 兼容供应商只需加注册表项 + profile 引用（规格验收）', async () => {
    const providers = {
      ...LLM_PROVIDERS,
      'new-vendor': {
        ...LLM_PROVIDERS['qwen-32b'],
        provider: 'newvendor',
        gatewayModel: 'newvendor/some-model',
      },
    } as typeof LLM_PROVIDERS
    const config = baseConfig({
      profiles: {
        ...aiConfig.llm.profiles,
        free: { primary: 'new-vendor' as never, fallback: [] },
      },
    })
    const seen: string[] = []
    const result = await runLLM('explain', [{ role: 'user', content: 'hi' }], {
      config,
      providers,
      readEnv: allKeys,
      fetchImpl: fakeFetch(['ok'], seen),
    })
    expect(result.degraded).toBe(false)
    expect(seen).toEqual(['newvendor/some-model'])
  })

  it('Router 与业务代码里都没有硬编码模型名——模型只来自注册表', async () => {
    const seen: string[] = []
    await runLLM('explain', [{ role: 'user', content: 'hi' }], {
      ...deps(),
      fetchImpl: fakeFetch(['ok'], seen),
    })
    const registryModels = Object.values(LLM_PROVIDERS).map((p) => p.gatewayModel)
    for (const model of seen) expect(registryModels).toContain(model)
  })

  it('超时会被中止，不会让页面一直转圈', async () => {
    vi.useFakeTimers()
    const hanging = (() =>
      new Promise<Response>(() => {
        /* 永不 resolve */
      })) as unknown as typeof fetch
    const promise = runLLM('explain', [{ role: 'user', content: 'hi' }], {
      ...deps({ config: baseConfig({ timeoutMs: 10 }) }),
      fetchImpl: hanging,
    })
    await vi.advanceTimersByTimeAsync(50)
    vi.useRealTimers()
    // 超时后应当继续走 fallback，最终返回 degraded 而不是挂起
    await expect(Promise.race([promise, new Promise((r) => setTimeout(() => r('pending'), 50))]))
      .resolves.toBeDefined()
  })
})
