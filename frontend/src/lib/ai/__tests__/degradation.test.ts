import { describe, expect, it } from 'vitest'
import { aiConfig, isAiEnabled } from '../../../config/ai.config'
import { aiAvailability } from '../orchestrator'
import { askJev, fitScoreOf } from '../jev/client'
import { fetchExplanation } from '../explainClient'
import { fitQuestions } from '../jev/questions'

const failingFetch = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
const throwingFetch = (async () => {
  throw new Error('network down')
}) as unknown as typeof fetch

describe('强制降级（红线 2）', () => {
  it('AI 默认关闭时，解释器直接返回 degraded，不发任何请求', async () => {
    expect(isAiEnabled()).toBe(false)
    let called = false
    const spyFetch = (async () => {
      called = true
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const result = await fetchExplanation(
      { facts: { valid: true }, language: 'zh' },
      { fetchImpl: spyFetch },
    )
    expect(result.degraded).toBe(true)
    expect(result.text).toBe('')
    expect(called).toBe(false)
  })

  it('端点报错 → Jev 降级返回空答案，调用方退回规则式排序', async () => {
    const result = await askJev(
      { state: { workStyle: 'analytical' }, questions: fitQuestions(['a']) },
      { fetchImpl: failingFetch },
    )
    expect(result.degraded).toBe(true)
    expect(result.answers).toEqual([])
    expect(fitScoreOf(result, 'a')).toBeNull()
  })

  it('网络异常 → Jev 不抛错，仍然降级', async () => {
    const result = await askJev(
      { state: {}, questions: fitQuestions(['a']) },
      { fetchImpl: throwingFetch },
    )
    expect(result.degraded).toBe(true)
  })

  it('端点返回形状不对 → 当作降级，不硬塞给 UI', async () => {
    const weird = (async () =>
      new Response(JSON.stringify({ answers: 'not-an-array' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch
    const result = await askJev({ state: {}, questions: fitQuestions(['a']) }, { fetchImpl: weird })
    expect(result.degraded).toBe(true)
  })

  it('AI 关闭时可用性如实反映原因', () => {
    expect(aiAvailability()).toEqual({
      enabled: false,
      jev: false,
      llm: false,
      reason: 'disabled-by-config',
    })
  })

  it('Jev 的 token 上限记录与官方一致，避免超限静默失败', () => {
    expect(aiConfig.jev.limits.totalTokens).toBe(64_000)
    expect(aiConfig.jev.limits.stateTokens).toBe(32_000)
  })
})
