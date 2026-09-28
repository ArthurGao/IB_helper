import { describe, expect, it } from 'vitest'
import { containsPii, isBlockedKey, redact } from '../redact'
import { ALLOWED_FACT_KEYS, buildExplainMessages, EXPLAIN_SYSTEM_PROMPT } from '../explain'
import { askJev } from '../jev/client'
import { PROFILE_QUESTIONS, fitQuestions } from '../jev/questions'

describe('PII 不出域（红线 3）', () => {
  it.each([
    'name',
    'firstName',
    'last_name',
    'fullName',
    'dateOfBirth',
    'dob',
    'school',
    'schoolId',
    'email',
    'phone',
    'address',
    'NSN',
    'studentId',
  ])('识别 PII 键：%s', (key) => {
    expect(isBlockedKey(key)).toBe(true)
  })

  it('抽象特征不被误判为 PII', () => {
    for (const key of ['workStyle', 'creditsCounted', 'ueAwarded', 'yearLevel']) {
      expect(isBlockedKey(key), key).toBe(false)
    }
  })

  it('白名单过滤：未列入的键一律丢弃', () => {
    const out = redact(
      { valid: true, name: '小明', school: 'Rangitoto College', secretNote: 'x' },
      ALLOWED_FACT_KEYS,
    )
    expect(out).toEqual({ valid: true })
  })

  it('嵌套结构里的 PII 也能被检出', () => {
    expect(containsPii({ profile: { interests: ['maths'], name: '小明' } })).toBe(true)
    expect(containsPii([{ ok: 1 }, { student: { dob: '2010-01-01' } }])).toBe(true)
    expect(containsPii({ profile: { interests: ['maths'], workStyle: 'analytical' } })).toBe(false)
  })

  it('解释请求的载荷里不含 PII（规格验收）', () => {
    const messages = buildExplainMessages({
      facts: {
        valid: false,
        ueAwarded: false,
        name: '小明',
        school: 'Rangitoto College',
        dateOfBirth: '2011-05-02',
      },
      language: 'zh',
    })
    const serialized = JSON.stringify(messages)
    expect(serialized).not.toContain('小明')
    expect(serialized).not.toContain('Rangitoto')
    expect(serialized).not.toContain('2011-05-02')
    expect(containsPii(messages)).toBe(false)
  })

  it('Jev 客户端在载荷含 PII 时拒绝发送，而不是自行脱敏后发出', async () => {
    await expect(
      askJev({ state: { name: '小明', interests: ['maths'] }, questions: PROFILE_QUESTIONS }),
    ).rejects.toThrow(/PII/)
  })

  it('Jev 的问题集里不含任何学生身份信息', () => {
    expect(containsPii(PROFILE_QUESTIONS)).toBe(false)
    expect(containsPii(fitQuestions(['plan-a', 'plan-b']))).toBe(false)
  })
})

describe('LLM 不得越界断言（红线 1）', () => {
  it('system prompt 明确禁止给出 FACTS 之外的资格结论', () => {
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/Never state a qualification outcome that is not in FACTS/)
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/Never invent credit numbers/)
    expect(EXPLAIN_SYSTEM_PROMPT).toMatch(/Do not tell the family which qualification or subject to choose/)
  })

  it('只有规则引擎算出的结论会被注入，其它一律不发', () => {
    const messages = buildExplainMessages({
      facts: {
        ueAwarded: false,
        ueMissing: ['ue-numeracy'],
        // 下面这些都不在白名单里——即使调用方传了也不该出现在载荷中
        guessedAtkinsonScore: 42,
        predictedUniversityOffer: 'Auckland Medicine',
      },
      language: 'en',
    })
    const serialized = JSON.stringify(messages)
    expect(serialized).toContain('ueAwarded')
    expect(serialized).not.toContain('predictedUniversityOffer')
    expect(serialized).not.toContain('guessedAtkinsonScore')
  })

  it('白名单本身不含任何可自由填写的字段', () => {
    for (const key of ALLOWED_FACT_KEYS) {
      expect(isBlockedKey(key), key).toBe(false)
    }
  })
})
