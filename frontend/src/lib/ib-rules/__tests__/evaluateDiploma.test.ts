import { describe, expect, it } from 'vitest'
import type { CoreGrade, SubjectGrade, SubjectGradeEntry, TokEeCell, TokEeMatrix } from '../../../types/ib'
import { diplomaRules, tokEeMatrix } from '../../../data'
import { evaluateDiploma, type DiplomaInput } from '../evaluateDiploma'

/**
 * 需要精确控制附加分的用例注入一个明确标注为「测试用」的假矩阵；
 * 真实矩阵（已对照官方核实）另有专门用例覆盖。
 */
function stubMatrix(cell: TokEeCell): TokEeMatrix {
  const row = { A: cell, B: cell, C: cell, D: cell, E: cell }
  return {
    ...tokEeMatrix,
    matrix: { A: row, B: row, C: row, D: row, E: row },
  }
}

const withStub = (cell: TokEeCell) => ({ rules: diplomaRules, matrix: stubMatrix(cell) })

/** 3 HL + 3 SL 的成绩单；grades 按 [HL,HL,HL,SL,SL,SL] 顺序给。 */
function gradesOf(values: SubjectGrade[]): SubjectGradeEntry[] {
  const codes = ['chemistry', 'math-aa', 'physics', 'lang-a-lit-en', 'mandarin-b', 'history']
  return values.map((grade, i) => ({
    code: codes[i] ?? `subject-${i}`,
    level: i < 3 ? 'HL' : 'SL',
    grade,
  }))
}

function input(values: SubjectGrade[], over: Partial<DiplomaInput> = {}): DiplomaInput {
  return { grades: gradesOf(values), tok: 'A', ee: 'A', casComplete: true, ...over }
}

const statusOf = (result: ReturnType<typeof evaluateDiploma>, id: string) =>
  result.conditions.find((c) => c.id === id)?.status

describe('evaluateDiploma', () => {
  it('满分 45、及格线 24 来自 diploma-rules.json', () => {
    expect(diplomaRules.maxPoints).toBe(45)
    expect(diplomaRules.passMark).toBe(24)
  })

  it('全 6 分 + TOK/EE 加 3 分 = 39 分，通过', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 6]), withStub(3))
    expect(result.subjectPoints).toBe(36)
    expect(result.coreBonus).toBe(3)
    expect(result.total).toBe(39)
    expect(result.max).toBe(45)
    expect(result.status).toBe('pass')
    expect(result.passed).toBe(true)
  })

  it('使用官方 TOK/EE 矩阵：TOK B + EE C = 2 分（官方示例）', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 6], { tok: 'B', ee: 'C' }))
    expect(result.coreBonus).toBe(2)
    expect(result.total).toBe(38)
    expect(result.status).toBe('pass')
  })

  it('官方矩阵四角：A/A = 3、D/D = 0、E 行列为失败条件', () => {
    expect(evaluateDiploma(input([6, 6, 6, 6, 6, 6], { tok: 'A', ee: 'A' })).coreBonus).toBe(3)
    expect(evaluateDiploma(input([6, 6, 6, 6, 6, 6], { tok: 'D', ee: 'D' })).coreBonus).toBe(0)
    const tokE = evaluateDiploma(input([6, 6, 6, 6, 6, 6], { tok: 'E', ee: 'A' }))
    expect(tokE.status).toBe('fail')
    expect(tokE.conditions.find((c) => c.id === 'tok-ee-matrix')?.status).toBe('failed')
  })

  it('矩阵单元格若为 null（未核实）则返回 indeterminate，不当成通过/不及格', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 6]), withStub(null))
    expect(result.coreBonus).toBeNull()
    expect(result.total).toBeNull()
    expect(result.status).toBe('indeterminate')
    expect(result.passed).toBe(false)
    expect(result.unverified).toContain('min-total')
  })

  it('总分低于 24 → min-total 亮红', () => {
    // 4+4+4+3+4+4 = 23，+0 附加分
    const result = evaluateDiploma(input([4, 4, 4, 3, 4, 4]), withStub(0))
    expect(result.total).toBe(23)
    expect(statusOf(result, 'min-total')).toBe('failed')
    expect(result.status).toBe('fail')
  })

  it('总分刚好 24 → min-total 通过', () => {
    const result = evaluateDiploma(input([4, 4, 4, 4, 4, 4]), withStub(0))
    expect(result.total).toBe(24)
    expect(statusOf(result, 'min-total')).toBe('passed')
    expect(result.status).toBe('pass')
  })

  it('CAS 未完成 → 不予文凭', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 6], { casComplete: false }), withStub(3))
    expect(statusOf(result, 'cas-complete')).toBe('failed')
    expect(result.status).toBe('fail')
  })

  it('任一科目出现 N → 不及格，且总分无法计算', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 'N']), withStub(3))
    expect(statusOf(result, 'no-subject-n')).toBe('failed')
    expect(result.subjectPoints).toBeNull()
    expect(result.total).toBeNull()
    expect(result.status).toBe('fail')
  })

  it('TOK 或 EE 出现 N → 不及格', () => {
    const tokN = evaluateDiploma(input([6, 6, 6, 6, 6, 6], { tok: 'N' as CoreGrade }), withStub(3))
    expect(statusOf(tokN, 'no-core-n')).toBe('failed')
    expect(tokN.status).toBe('fail')
  })

  it('TOK 或 EE 出现 E → 不及格', () => {
    const tokE = evaluateDiploma(input([6, 6, 6, 6, 6, 6], { tok: 'E' }), withStub(3))
    expect(statusOf(tokE, 'no-core-e')).toBe('failed')
    const eeE = evaluateDiploma(input([6, 6, 6, 6, 6, 6], { ee: 'E' }), withStub(3))
    expect(statusOf(eeE, 'no-core-e')).toBe('failed')
  })

  it('任一科目成绩 1 → 不及格', () => {
    const result = evaluateDiploma(input([7, 7, 7, 7, 7, 1]), withStub(3))
    expect(statusOf(result, 'no-grade-1')).toBe('failed')
    expect(result.status).toBe('fail')
  })

  it('成绩 2 最多 2 门：2 门通过、3 门不及格', () => {
    const two = evaluateDiploma(input([7, 7, 7, 7, 2, 2]), withStub(3))
    expect(statusOf(two, 'max-grade-2')).toBe('passed')
    const three = evaluateDiploma(input([7, 7, 7, 2, 2, 2]), withStub(3))
    expect(statusOf(three, 'max-grade-2')).toBe('failed')
  })

  it('成绩 3 或以下最多 3 门：3 门通过、4 门不及格', () => {
    const three = evaluateDiploma(input([7, 7, 7, 3, 3, 3]), withStub(3))
    expect(statusOf(three, 'max-grade-3-or-below')).toBe('passed')
    const four = evaluateDiploma(input([7, 7, 3, 3, 3, 3]), withStub(3))
    expect(statusOf(four, 'max-grade-3-or-below')).toBe('failed')
  })

  it('HL 总分（3 门 HL）低于 12 → 不及格；等于 12 → 通过', () => {
    const below = evaluateDiploma(input([3, 4, 4, 7, 7, 7]), withStub(3))
    expect(statusOf(below, 'min-hl-points')).toBe('failed')
    const exactly = evaluateDiploma(input([4, 4, 4, 7, 7, 7]), withStub(3))
    expect(statusOf(exactly, 'min-hl-points')).toBe('passed')
  })

  it('4 门 HL 时取最高 3 门计算 HL 总分', () => {
    const grades: SubjectGradeEntry[] = [
      { code: 'chemistry', level: 'HL', grade: 4 },
      { code: 'math-aa', level: 'HL', grade: 4 },
      { code: 'physics', level: 'HL', grade: 4 },
      { code: 'history', level: 'HL', grade: 1 },
      { code: 'lang-a-lit-en', level: 'SL', grade: 7 },
      { code: 'mandarin-b', level: 'SL', grade: 7 },
    ]
    const result = evaluateDiploma({ grades, tok: 'A', ee: 'A', casComplete: true }, withStub(3))
    // 最高 3 门 HL = 4+4+4 = 12 ≥ 12
    expect(statusOf(result, 'min-hl-points')).toBe('passed')
  })

  it('SL 总分：3 门 SL 阈值 9 来自数据；低于则不及格', () => {
    const below = evaluateDiploma(input([7, 7, 7, 3, 3, 2]), withStub(3))
    expect(statusOf(below, 'min-sl-points')).toBe('failed')
    const exactly = evaluateDiploma(input([7, 7, 7, 3, 3, 3]), withStub(3))
    expect(statusOf(exactly, 'min-sl-points')).toBe('passed')
  })

  it('4HL/2SL：SL 阈值为官方的 5 分——12 分通过', () => {
    const grades: SubjectGradeEntry[] = [
      { code: 'chemistry', level: 'HL', grade: 6 },
      { code: 'math-aa', level: 'HL', grade: 6 },
      { code: 'physics', level: 'HL', grade: 6 },
      { code: 'history', level: 'HL', grade: 6 },
      { code: 'lang-a-lit-en', level: 'SL', grade: 6 },
      { code: 'mandarin-b', level: 'SL', grade: 6 },
    ]
    const result = evaluateDiploma({ grades, tok: 'A', ee: 'A', casComplete: true }, withStub(3))
    expect(statusOf(result, 'min-sl-points')).toBe('passed')
    expect(result.unverified).toEqual([])
    expect(result.status).toBe('pass')
  })

  it('4HL/2SL：两门 SL 合计低于 5 分 → 不及格', () => {
    const grades: SubjectGradeEntry[] = [
      { code: 'chemistry', level: 'HL', grade: 7 },
      { code: 'math-aa', level: 'HL', grade: 7 },
      { code: 'physics', level: 'HL', grade: 7 },
      { code: 'history', level: 'HL', grade: 7 },
      { code: 'lang-a-lit-en', level: 'SL', grade: 2 },
      { code: 'mandarin-b', level: 'SL', grade: 2 },
    ]
    const result = evaluateDiploma({ grades, tok: 'A', ee: 'A', casComplete: true }, withStub(3))
    expect(statusOf(result, 'min-sl-points')).toBe('failed')
    expect(result.status).toBe('fail')
  })

  it('阈值缺失时仍然报「无法判定」（用只有 3SL 阈值的规则集验证）', () => {
    const rulesWithoutTwoSl = {
      ...diplomaRules,
      conditions: diplomaRules.conditions.map((c) =>
        c.id === 'min-sl-points' ? { ...c, thresholdBySlCount: { '3': 9 } } : c,
      ),
    }
    const grades: SubjectGradeEntry[] = [
      { code: 'chemistry', level: 'HL', grade: 6 },
      { code: 'math-aa', level: 'HL', grade: 6 },
      { code: 'physics', level: 'HL', grade: 6 },
      { code: 'history', level: 'HL', grade: 6 },
      { code: 'lang-a-lit-en', level: 'SL', grade: 6 },
      { code: 'mandarin-b', level: 'SL', grade: 6 },
    ]
    const result = evaluateDiploma(
      { grades, tok: 'A', ee: 'A', casComplete: true },
      { rules: rulesWithoutTwoSl, matrix: stubMatrix(3) },
    )
    expect(statusOf(result, 'min-sl-points')).toBe('unverified')
    expect(result.status).toBe('indeterminate')
  })

  it('矩阵判定为 FAIL 时追加一条失败条件（文案取自数据文件）', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 6]), withStub('FAIL'))
    const matrixCondition = result.conditions.find((c) => c.id === 'tok-ee-matrix')
    expect(matrixCondition?.status).toBe('failed')
    expect(matrixCondition?.msg).toEqual(tokEeMatrix.failMsg)
    expect(result.status).toBe('fail')
  })

  it('已确定失败时不会被「未核实」冲淡（仍为 fail）', () => {
    const result = evaluateDiploma(input([7, 7, 7, 7, 7, 1]))
    expect(result.status).toBe('fail')
  })

  it('不足 6 门：即使分数很高也不能说「通过」（回归：5 门 7 分曾被判 pass）', () => {
    const fiveSubjects: SubjectGradeEntry[] = [
      { code: 'chemistry', level: 'HL', grade: 7 },
      { code: 'math-aa', level: 'HL', grade: 7 },
      { code: 'physics', level: 'HL', grade: 7 },
      { code: 'lang-a-lit-en', level: 'SL', grade: 7 },
      { code: 'mandarin-b', level: 'SL', grade: 7 },
    ]
    const result = evaluateDiploma(
      { grades: fiveSubjects, tok: 'A', ee: 'A', casComplete: true },
      withStub(3),
    )
    expect(result.status).toBe('incomplete')
    expect(result.passed).toBe(false)
  })

  it('一门没选 / 多选一门同样是 incomplete', () => {
    const none = evaluateDiploma({ grades: [], tok: 'A', ee: 'A', casComplete: true }, withStub(3))
    expect(none.status).toBe('incomplete')

    const seven: SubjectGradeEntry[] = [
      ...gradesOf([7, 7, 7, 7, 7, 7]),
      { code: 'biology', level: 'SL', grade: 7 },
    ]
    const tooMany = evaluateDiploma(
      { grades: seven, tok: 'A', ee: 'A', casComplete: true },
      withStub(3),
    )
    expect(tooMany.status).toBe('incomplete')
  })

  it('不足 6 门但已有条件确定不满足时，仍然如实报 fail', () => {
    const withGradeOne: SubjectGradeEntry[] = [
      { code: 'chemistry', level: 'HL', grade: 1 },
      { code: 'math-aa', level: 'HL', grade: 7 },
      { code: 'physics', level: 'HL', grade: 7 },
      { code: 'lang-a-lit-en', level: 'SL', grade: 7 },
      { code: 'mandarin-b', level: 'SL', grade: 7 },
    ]
    const result = evaluateDiploma(
      { grades: withGradeOne, tok: 'A', ee: 'A', casComplete: true },
      withStub(3),
    )
    expect(result.status).toBe('fail')
  })

  it('六门但结构不合法（如六门重复课）→ incomplete，绝不报 pass', () => {
    // 六门满分，但结构校验说不合法：官方条件以合法的六门组合为前提。
    const result = evaluateDiploma(
      { grades: gradesOf([7, 7, 7, 7, 7, 7]), tok: 'A', ee: 'A', casComplete: true, structureValid: false },
      withStub(3),
    )
    expect(result.status).toBe('incomplete')
    expect(result.incompleteReason).toBe('structure')
    expect(result.passed).toBe(false)
  })

  it('结构合法 + 六门 → 正常判定', () => {
    const result = evaluateDiploma(
      { grades: gradesOf([7, 7, 7, 7, 7, 7]), tok: 'A', ee: 'A', casComplete: true, structureValid: true },
      withStub(3),
    )
    expect(result.status).toBe('pass')
    expect(result.incompleteReason).toBeUndefined()
  })

  it('不传 structureValid 时退回「只看科目数」，且原因标为 subject-count', () => {
    const five = gradesOf([7, 7, 7, 7, 7])
    const result = evaluateDiploma({ grades: five, tok: 'A', ee: 'A', casComplete: true }, withStub(3))
    expect(result.status).toBe('incomplete')
    expect(result.incompleteReason).toBe('subject-count')
  })

  it('结构不合法但已有确定失败项时，仍如实报 fail', () => {
    const result = evaluateDiploma(
      { grades: gradesOf([1, 7, 7, 7, 7, 7]), tok: 'A', ee: 'A', casComplete: true, structureValid: false },
      withStub(3),
    )
    expect(result.status).toBe('fail')
  })

  it('官方数据已核实：矩阵与阈值都不再是 null', () => {
    expect(tokEeMatrix._verify?.status).toBe('verified')
    const sl = diplomaRules.conditions.find((c) => c.id === 'min-sl-points')
    expect(sl?.thresholdBySlCount).toEqual({ '3': 9, '2': 5 })
  })

  it('每条条件都带双语文案（来自 diploma-rules.json）', () => {
    const result = evaluateDiploma(input([6, 6, 6, 6, 6, 6]), withStub(3))
    for (const condition of result.conditions) {
      expect(condition.msg.en.length).toBeGreaterThan(0)
      expect(condition.msg.zh.length).toBeGreaterThan(0)
    }
  })
})
