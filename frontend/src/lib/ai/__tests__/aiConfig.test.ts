import { describe, expect, it } from 'vitest'
import { aiConfig, isAiEnabled } from '../../../config/ai.config'
import { LLM_PROVIDERS } from '../../../config/llm-providers'
import { aiAvailability } from '../orchestrator'

describe('AI 配置层', () => {
  it('X1 阶段 AI 默认关闭——app 必须是纯规则工具', () => {
    expect(isAiEnabled()).toBe(false)
    expect(aiAvailability()).toEqual({
      enabled: false,
      jev: false,
      llm: false,
      reason: 'disabled-by-config',
    })
  })

  it('每个 profile 引用的供应商都存在于注册表', () => {
    for (const profile of Object.values(aiConfig.llm.profiles)) {
      expect(LLM_PROVIDERS[profile.primary], profile.primary).toBeDefined()
      for (const id of profile.fallback) expect(LLM_PROVIDERS[id], id).toBeDefined()
    }
  })

  it('每个 taskOverride 指向已定义的 profile', () => {
    for (const [task, profileId] of Object.entries(aiConfig.llm.taskOverrides)) {
      expect(aiConfig.llm.profiles[profileId!], `${task} -> ${profileId}`).toBeDefined()
    }
  })

  it('配置里只出现环境变量名，绝不出现明文密钥', () => {
    const serialized = JSON.stringify({ aiConfig, LLM_PROVIDERS })
    // 常见密钥前缀：sk-、gsk_、AIza
    expect(serialized).not.toMatch(/\b(sk-[A-Za-z0-9]|gsk_[A-Za-z0-9]|AIza[A-Za-z0-9])/)
    for (const entry of Object.values(LLM_PROVIDERS)) {
      expect(entry.keyEnv).toMatch(/^[A-Z0-9_]+$/)
    }
  })

  it('隐私门控默认开启（不允许会拿数据训练的供应商）', () => {
    expect(aiConfig.llm.allowTrainsOnDataProviders).toBe(false)
  })

  it('注册表里的模型 id 都带 owner 前缀，且标了核实日期', () => {
    for (const [id, entry] of Object.entries(LLM_PROVIDERS)) {
      expect(entry.gatewayModel, id).toMatch(/^[a-z0-9-]+\/[a-z0-9.\-]+$/)
      expect(entry.gatewayModel.startsWith(`${entry.provider}/`), id).toBe(true)
      expect(entry.lastVerified, id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('Jev 用实测存在的 id，并记录了官方的 token 上限', () => {
    expect(aiConfig.jev.gatewayModel).toBe('typesafe-ai/jev')
    expect(aiConfig.jev.limits).toEqual({ totalTokens: 64_000, stateTokens: 32_000 })
  })
})
