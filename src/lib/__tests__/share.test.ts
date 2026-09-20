import { describe, expect, it } from 'vitest'
import { decodePlan, encodePlan, planShareUrl, readPlanFromSearch } from '../share'
import { emptyPlan } from '../plan'

const plan = {
  ...emptyPlan(),
  subjects: [
    { code: 'lang-a-lit-en', level: 'HL' as const },
    { code: 'math-aa', level: 'HL' as const },
  ],
  targetPathwayIds: ['medicine'],
  schoolId: 'kristin-school',
  dpStartYear: 2027,
  grades: { safe: { 'math-aa': 5 as const }, best: { 'math-aa': 7 as const } },
}

describe('方案分享编解码', () => {
  it('编码后再解码得到同一个方案（槽位会被补齐）', () => {
    const decoded = decodePlan(encodePlan(plan))
    expect(decoded?.subjects).toEqual(plan.subjects)
    expect(decoded?.targetPathwayIds).toEqual(plan.targetPathwayIds)
    expect(decoded?.grades).toEqual(plan.grades)
    // 只给 subjects 的旧链接会按科目所属学科组反推槽位
    expect(decoded?.slots).toEqual([
      { slot: 1, code: 'lang-a-lit-en', level: 'HL' },
      { slot: 5, code: 'math-aa', level: 'HL' },
    ])
  })

  it('考试 session 会被保留（否则接收方无法判新旧大纲）', () => {
    const november = { ...plan, examSession: 'november' as const }
    expect(decodePlan(encodePlan(november))?.examSession).toBe('november')
    const may = { ...plan, examSession: 'may' as const }
    expect(decodePlan(encodePlan(may))?.examSession).toBe('may')
    // 未选择时不应凭空补一个
    expect(decodePlan(encodePlan(plan))?.examSession).toBeUndefined()
  })

  it('带槽位的方案原样往返', () => {
    const withSlots = {
      ...plan,
      slots: [
        { slot: 1 as const, code: 'lang-a-lit-en', level: 'HL' as const },
        { slot: 5 as const, code: 'math-aa', level: 'HL' as const },
      ],
    }
    expect(decodePlan(encodePlan(withSlots))).toEqual(withSlots)
  })

  it('编码结果是 URL-safe 的（不含 + / =）', () => {
    expect(encodePlan(plan)).not.toMatch(/[+/=]/)
  })

  it('中文字段也能正确往返（UTF-8）', () => {
    const named = { ...plan, targetPathwayIds: ['医学-测试'] }
    expect(decodePlan(encodePlan(named))?.targetPathwayIds).toEqual(['医学-测试'])
  })

  it('损坏或非方案的字符串返回 null，而不是抛错', () => {
    expect(decodePlan('not-base64!!')).toBeNull()
    expect(decodePlan(encodePlan({ ...plan, subjects: undefined as never }))).toBeNull()
  })

  it('从 query string 读取方案；没有参数时返回 null', () => {
    const url = planShareUrl(plan, 'https://example.com')
    const search = url.slice(url.indexOf('?'))
    expect(readPlanFromSearch(search)?.subjects).toEqual(plan.subjects)
    expect(readPlanFromSearch('?other=1')).toBeNull()
  })

  it('旧版本链接缺字段时补上默认值', () => {
    const partial = encodePlan({ subjects: [] } as never)
    const decoded = decodePlan(partial)
    expect(decoded?.grades).toEqual({ safe: {}, best: {} })
    expect(decoded?.tok).toBe('C')
  })
})

describe('警告上下文', () => {
  it('两处（选课页 / 对比页）共用同一份上下文构造', async () => {
    const { warningsContextOf } = await import('../plan')
    expect(warningsContextOf({ ...plan, nativeLanguageIsEnglish: false }, true)).toEqual({
      targetPathwayIds: ['medicine'],
      structureValid: true,
      nativeLanguageIsEnglish: false,
    })
    // 未填写母语信息时不应凭空塞入该字段（否则会误触发警告规则）
    expect(warningsContextOf(plan, false)).toEqual({
      targetPathwayIds: ['medicine'],
      structureValid: false,
    })
  })
})

describe('分享链接的运行时校验（链接内容不可信）', () => {
  // 手工编码「坏数据」，因为 encodePlan 只接受合法的 Plan。
  const encode = (value: unknown): string => {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  it('slots 不是数组时退化为空数组，而不是灌进 UI（原会导致 .find 崩溃）', () => {
    const decoded = decodePlan(encode({ subjects: [], slots: {} }))
    expect(decoded?.slots).toEqual([])
  })

  it('推不出合法槽位的科目被丢弃，而不是塞进不相干的学科组', () => {
    const decoded = decodePlan(
      encode({
        subjects: [
          { code: 'history', level: 'HL' },
          { code: 'economics', level: 'SL' },
          { code: 'geography', level: 'SL' },
        ],
      }),
    )
    // history → Group 3，economics → 替换槽 6，geography 无处可放 → 丢弃
    expect(decoded?.slots).toEqual([
      { slot: 3, code: 'history', level: 'HL' },
      { slot: 6, code: 'economics', level: 'SL' },
    ])
    expect(decoded?.subjects.map((s) => s.code)).not.toContain('geography')
  })

  it('旧链接反推槽位：第二门 Group 3 落到替换槽 6，而不是空着的 Group 4', () => {
    const decoded = decodePlan(
      encode({
        subjects: [
          { code: 'history', level: 'HL' },
          { code: 'economics', level: 'SL' },
        ],
      }),
    )
    expect(decoded?.slots).toEqual([
      { slot: 3, code: 'history', level: 'HL' },
      { slot: 6, code: 'economics', level: 'SL' },
    ])
  })

  it('丢弃结构不合法的科目条目', () => {
    const decoded = decodePlan(
      encode({
        subjects: [
          { code: 'math-aa', level: 'HL' },
          { code: 'math-ai', level: 'XL' },
          { code: 123, level: 'SL' },
          'not-an-object',
          {},
        ],
      }),
    )
    expect(decoded?.subjects).toEqual([{ code: 'math-aa', level: 'HL' }])
  })

  it('丢弃不合法的槽位（slot 必须是 1–6 的整数）', () => {
    const decoded = decodePlan(
      encode({
        subjects: [],
        slots: [
          { slot: 3, code: 'history', level: 'SL' },
          { slot: 9, code: 'history', level: 'SL' },
          { slot: 'x', code: 'history', level: 'SL' },
        ],
      }),
    )
    expect(decoded?.slots).toEqual([{ slot: 3, code: 'history', level: 'SL' }])
  })

  it('丢弃不合法的预估分（只接受 1–7 的整数或 N）', () => {
    const decoded = decodePlan(
      encode({
        subjects: [],
        grades: { safe: { a: 5, b: 9, c: 'N', d: 'oops', e: 3.5 }, best: 'not-an-object' },
      }),
    )
    expect(decoded?.grades.safe).toEqual({ a: 5, c: 'N' })
    expect(decoded?.grades.best).toEqual({})
  })

  it('非法的 session 值被丢弃', () => {
    expect(decodePlan(encode({ subjects: [], examSession: 'august' }))?.examSession).toBeUndefined()
  })

  it('非法的 TOK/EE/CAS/年份回落到默认值', () => {
    const decoded = decodePlan(
      encode({ subjects: [], tok: 'Z', ee: 42, casComplete: 'yes', dpStartYear: 1200 }),
    )
    expect(decoded?.tok).toBe('C')
    expect(decoded?.ee).toBe('C')
    expect(decoded?.casComplete).toBe(true)
    expect(decoded?.dpStartYear).toBeUndefined()
  })

  it('subjects 与 slots 不一致时以槽位为准（界面与引擎不会各看一套课）', () => {
    const decoded = decodePlan(
      encode({
        subjects: [{ code: 'biology', level: 'SL' }],
        slots: [{ slot: 4, code: 'chemistry', level: 'HL' }],
      }),
    )
    expect(decoded?.subjects).toEqual([{ code: 'chemistry', level: 'HL' }])
    expect(decoded?.slots).toEqual([{ slot: 4, code: 'chemistry', level: 'HL' }])
  })

  it('目标方向/大学 id 必须是字符串数组', () => {
    const decoded = decodePlan(
      encode({ subjects: [], targetPathwayIds: ['medicine', 7, null], targetUniversityIds: 'auckland' }),
    )
    expect(decoded?.targetPathwayIds).toEqual(['medicine'])
    expect(decoded?.targetUniversityIds).toEqual([])
  })
})
