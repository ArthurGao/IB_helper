import { describe, expect, it } from 'vitest'
import type { DataFileMeta, L10n } from '../../types/ib'
import {
  curriculumUpdates,
  curriculumUpdatesFile,
  diplomaRules,
  groups,
  groupsFile,
  pathways,
  pathwaysFile,
  schools,
  schoolsFile,
  subjects,
  subjectsFile,
  tokEeMatrix,
  universities,
  universitiesFile,
  warningRules,
  warningsRulesFile,
} from '..'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const files: Array<[string, DataFileMeta]> = [
  ['subjects.json', subjectsFile],
  ['groups.json', groupsFile],
  ['pathways.json', pathwaysFile],
  ['universities.json', universitiesFile],
  ['nz-schools.json', schoolsFile],
  ['diploma-rules.json', diplomaRules],
  ['tokEeMatrix.json', tokEeMatrix],
  ['warnings-rules.json', warningsRulesFile],
  ['curriculum-updates.json', curriculumUpdatesFile],
]

function expectBilingual(value: L10n, label: string): void {
  expect(value.en.trim().length, `${label}.en`).toBeGreaterThan(0)
  expect(value.zh.trim().length, `${label}.zh`).toBeGreaterThan(0)
}

describe('数据文件约定', () => {
  it.each(files)('%s 带 lastVerified（ISO 日期）与 sourceUrl', (_name, file) => {
    expect(file.lastVerified).toMatch(ISO_DATE)
    expect(file.sourceUrl.startsWith('http')).toBe(true)
  })

  it.each(files)('%s 的 _verify 备注本身也是双语的', (name, file) => {
    if (!file._verify) return
    expectBilingual(file._verify.note, `${name}._verify.note`)
  })

  it('ESS 同时提供 SL 与 HL（官方 2024 起）', () => {
    const ess = subjects.find((s) => s.code === 'ess')
    expect(ess?.levels).toEqual(expect.arrayContaining(['SL', 'HL']))
    expect(ess?.satisfiesGroups).toEqual([3, 4])
  })

  it('Group 3 覆盖官方全部科目（含此前缺失的几门）', () => {
    const codes = new Set(subjects.filter((s) => s.group === 3).map((s) => s.code))
    for (const code of [
      'business-management',
      'economics',
      'geography',
      'global-politics',
      'history',
      'digital-society',
      'philosophy',
      'psychology',
      'social-cultural-anthropology',
      'world-religions',
    ]) {
      expect(codes.has(code), `Group 3 缺少 ${code}`).toBe(true)
    }
  })

  it('World Religions 只提供 SL（官方仅有 SL subject brief）', () => {
    const wr = subjects.find((s) => s.code === 'world-religions')
    expect(wr?.levels).toEqual(['SL'])
    expect(wr?._verify?.status).toBe('verified')
    // 名称保持当前课程名，替代课程的信息放在 note 与 /updates 里
    expect(wr?.name.en).toBe('World Religions')
    expect(wr?.note?.zh).toContain('religion and society')
  })

  it('文凭规则声明了科目门数（引擎据此判定「未选满」）', () => {
    expect(diplomaRules.requiredSubjectCount).toBe(6)
  })

  it('Group 2 含古典语言', () => {
    expect(subjects.some((s) => s.code === 'classical-languages' && s.group === 2)).toBe(true)
  })

  it('所有科目：code 唯一、双语名称、层级非空、跨学科组包含自身组', () => {
    const seen = new Set<string>()
    for (const subject of subjects) {
      expect(seen.has(subject.code), `duplicate code ${subject.code}`).toBe(false)
      seen.add(subject.code)
      expectBilingual(subject.name, subject.code)
      expect(subject.levels.length).toBeGreaterThan(0)
      expect(subject.group).toBeGreaterThanOrEqual(1)
      expect(subject.group).toBeLessThanOrEqual(6)
      if (subject.satisfiesGroups) {
        expect(subject.satisfiesGroups).toContain(subject.group)
        expect(subject.satisfiesGroups.length).toBeGreaterThan(1)
      }
    }
  })

  it('六大学科组齐全且双语', () => {
    expect(groups.map((g) => g.id)).toEqual([1, 2, 3, 4, 5, 6])
    for (const group of groups) {
      expectBilingual(group.name, `group ${group.id}`)
      expectBilingual(group.description, `group ${group.id} desc`)
      for (const code of group.exampleSubjectCodes) {
        expect(subjects.some((s) => s.code === code), `${code} 未在 subjects.json 中`).toBe(true)
      }
    }
  })

  it('方向的 HL 需求都指向真实科目 code 或 tag:', () => {
    const codes = new Set(subjects.map((s) => s.code))
    const tags = new Set(subjects.flatMap((s) => s.tags ?? []))
    for (const pathway of pathways) {
      expectBilingual(pathway.name, pathway.id)
      expectBilingual(pathway.note, `${pathway.id}.note`)
      for (const token of [...pathway.requiredHL, ...pathway.recommendedHL]) {
        for (const alt of token.split('|')) {
          const ok = alt.startsWith('tag:') ? tags.has(alt.slice(4)) : codes.has(alt)
          expect(ok, `${pathway.id}: ${alt}`).toBe(true)
        }
      }
    }
  })

  it('大学：双语名称、NZ 均为 24 分、缺 sourceUrl 的必须带未核实备注', () => {
    expect(universities.length).toBe(8)
    for (const university of universities) {
      expectBilingual(university.name, university.id)
      expect(university.lastVerified).toMatch(ISO_DATE)
      if (university.country === 'NZ') expect(university.ibMinPoints).toBe(24)
      if (university.sourceUrl === null) {
        expect(university._verify?.status, `${university.id} 缺来源但未标注`).toBe('unverified')
      }
    }
  })

  it('学校：双语名称/城市、lastVerified、指向 IB 官方目录', () => {
    for (const school of schools) {
      expectBilingual(school.name, school.id)
      expectBilingual(school.city, `${school.id}.city`)
      expect(school.lastVerified).toMatch(ISO_DATE)
      expect(school.programmes.length).toBeGreaterThan(0)
      expect(school.sourceUrl?.startsWith('http')).toBe(true)
    }
  })

  it('文凭规则：每条都带核实状态与双语来源说明，阈值不得留空', () => {
    expect(diplomaRules.conditions.length).toBeGreaterThan(0)
    for (const condition of diplomaRules.conditions) {
      expectBilingual(condition.msg, condition.id)
      expect(['verified', 'unverified']).toContain(condition._verify?.status)
      expectBilingual(condition._verify!.note, `${condition.id}._verify`)
      // 已核实的条件不允许还留着 null 阈值（否则引擎会一直报「无法判定」）
      if (condition._verify?.status === 'verified') {
        if (condition.threshold !== undefined) expect(condition.threshold).not.toBeNull()
        for (const [slCount, value] of Object.entries(condition.thresholdBySlCount ?? {})) {
          expect(value, `${condition.id}.thresholdBySlCount.${slCount}`).not.toBeNull()
        }
      }
    }
  })

  it('SL 最低分：3 门 SL = 9 分，2 门 SL = 5 分（官方 passing criteria）', () => {
    const sl = diplomaRules.conditions.find((c) => c.id === 'min-sl-points')
    expect(sl?.thresholdBySlCount).toEqual({ '3': 9, '2': 5 })
    expect(sl?._verify?.status).toBe('verified')
  })

  it('TOK/EE 矩阵：5x5 结构完整，取值只能是 0–3 或 FAIL（不得留 null）', () => {
    const gradeKeys = ['A', 'B', 'C', 'D', 'E']
    expect(Object.keys(tokEeMatrix.matrix)).toEqual(gradeKeys)
    for (const tok of gradeKeys) {
      expect(Object.keys(tokEeMatrix.matrix[tok] ?? {})).toEqual(gradeKeys)
      for (const ee of gradeKeys) {
        const cell = tokEeMatrix.matrix[tok]?.[ee]
        const ok = cell === 'FAIL' || (typeof cell === 'number' && cell >= 0 && cell <= 3)
        expect(ok, `matrix[${tok}][${ee}] = ${String(cell)}`).toBe(true)
      }
    }
    expect(tokEeMatrix._verify?.status).toBe('verified')
    expectBilingual(tokEeMatrix.failMsg, 'tokEeMatrix.failMsg')
  })

  it('TOK/EE 矩阵：E 行与 E 列全为失败条件，官方示例 TOK B + EE C = 2', () => {
    for (const grade of ['A', 'B', 'C', 'D', 'E']) {
      expect(tokEeMatrix.matrix.E?.[grade], `matrix[E][${grade}]`).toBe('FAIL')
      expect(tokEeMatrix.matrix[grade]?.E, `matrix[${grade}][E]`).toBe('FAIL')
    }
    expect(tokEeMatrix.matrix.B?.C).toBe(2)
  })

  it('警告规则：id 唯一、双语文案、severity 合法', () => {
    const seen = new Set<string>()
    for (const rule of warningRules) {
      expect(seen.has(rule.id)).toBe(false)
      seen.add(rule.id)
      expectBilingual(rule.msg, rule.id)
      expect(['high', 'medium', 'low']).toContain(rule.severity)
      expect(Object.keys(rule.when).length).toBeGreaterThan(0)
    }
  })

  it('课程改革时间线：双语、引用真实科目 code', () => {
    const codes = new Set(subjects.map((s) => s.code))
    for (const update of curriculumUpdates) {
      expectBilingual(update.name, update.id)
      expectBilingual(update.note, `${update.id}.note`)
      for (const code of update.subjectCodes) {
        expect(codes.has(code), `${update.id}: ${code}`).toBe(true)
      }
    }
  })
})
