import { describe, expect, it } from 'vitest'
import { containsPii, findPiiInValue, scrubValue } from '../redact'
import { MAX_QUESTION_CHARS, buildExplainMessages } from '../explain'

/**
 * 回归测试：安全审查发现的三个问题。
 * 1. 公开端点接受客户端指定模型 → 计费滥用 + 绕过隐私门控（服务端改为自行推导）
 * 2. 无 Origin 校验 / 无体积上限
 * 3. PII 闸门只查键名，不查值
 */
describe('值级 PII 检测（审查问题 3）', () => {
  it.each([
    ['邮箱', 'contact me at parent@example.com'],
    ['NZ 手机', 'call 021 555 1234'],
    ['NZ 座机 +64', 'phone +64 9 555 0000'],
    ['NSN 九位学号', 'her NSN is 123456789'],
    ['出生日期', 'born 2011-05-02'],
    ['英文校名', 'she is at Rangitoto College this year'],
  ])('识别值里的 %s', (_label, text) => {
    expect(findPiiInValue(text)).not.toBeNull()
  })

  it('普通提问不会被误判', () => {
    for (const text of [
      '她数学很好，应该选 Calculus 还是 Statistics？',
      'Is 14 credits enough for UE?',
      '孩子现在 Year 11，2028 年考哪一套？',
    ]) {
      expect(findPiiInValue(text), text).toBeNull()
    }
  })

  it('字符串值里的 PII 会让整个载荷被判定为含 PII', () => {
    // 这正是之前漏掉的情形：键名干净，值里带了身份信息
    expect(containsPii({ content: 'my daughter at Kristin School' })).toBe(true)
    expect(containsPii([{ role: 'user', content: 'email me at a@b.com' }])).toBe(true)
    expect(containsPii({ content: '她想读工程，选什么好？' })).toBe(false)
  })

  it('自由提问在发送前被清洗，原始身份信息不出现在载荷里', () => {
    const messages = buildExplainMessages({
      facts: { ueAwarded: false },
      language: 'zh',
      question: '我女儿在 Rangitoto College，手机 021 555 1234，邮箱 mum@example.com，该怎么选？',
    })
    const serialized = JSON.stringify(messages)
    expect(serialized).not.toContain('Rangitoto College')
    expect(serialized).not.toContain('021 555 1234')
    expect(serialized).not.toContain('mum@example.com')
    expect(serialized).toContain('removed')
  })

  it('提问超长会被截断（控成本，也限制能塞进去的信息量）', () => {
    const long = 'a'.repeat(MAX_QUESTION_CHARS * 3)
    const messages = buildExplainMessages({ facts: {}, language: 'en', question: long })
    const userMessage = messages[1]!.content
    expect(userMessage.length).toBeLessThan(MAX_QUESTION_CHARS * 2)
  })

  it('scrubValue 会替换掉所有出现，而不只是第一处', () => {
    const scrubbed = scrubValue('a@b.com and c@d.com')
    expect(scrubbed).not.toContain('a@b.com')
    expect(scrubbed).not.toContain('c@d.com')
  })

  it('已知局限：自由文本里的中文人名检测不到——靠 UI 提示而非正则', () => {
    // 如实记录能力边界，避免后来者误以为这里能兜住一切
    expect(findPiiInValue('我女儿张小雨想读医学')).toBeNull()
  })
})
