import { describe, expect, it } from 'vitest'
import type { DataFileMeta, L10n } from '../../../types/ib'
import {
  comparisonFile,
  comparisonRows,
  nceaLevels,
  nceaLevelsFile,
  newQualifications,
  newQualificationsFile,
  reformMilestones,
  reformTimelineFile,
  ueApprovedSubjects,
  ueApprovedSubjectsFile,
  ueRequirements,
  ueRequirementsFile,
} from '..'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const files: Array<[string, DataFileMeta]> = [
  ['ncea-levels.json', nceaLevelsFile],
  ['ue-requirements.json', ueRequirementsFile],
  ['ue-approved-subjects.json', ueApprovedSubjectsFile],
  ['reform-timeline.json', reformTimelineFile],
  ['new-qualifications.json', newQualificationsFile],
  ['comparison.json', comparisonFile],
]

function expectBilingual(value: L10n, label: string): void {
  expect(value.en.trim().length, `${label}.en`).toBeGreaterThan(0)
  expect(value.zh.trim().length, `${label}.zh`).toBeGreaterThan(0)
}

describe('NCEA 数据文件约定', () => {
  it.each(files)('%s 带 lastVerified（ISO）与 sourceUrl', (_name, file) => {
    expect(file.lastVerified).toMatch(ISO_DATE)
    expect(file.sourceUrl.startsWith('http')).toBe(true)
  })

  it.each(files)('%s 标了核实状态，且备注本身双语', (name, file) => {
    expect(['verified', 'unverified'], name).toContain(file._verify?.status)
    expectBilingual(file._verify!.note, `${name}._verify.note`)
  })

  it.each(files)('%s 的来源必须是官方域名', (name, file) => {
    expect(file.sourceUrl, name).toMatch(/https:\/\/[^/]*\.(govt\.nz)\//)
  })

  it('三级 NCEA 齐全，且 co-requisite 独立于学分（2024 起的规则）', () => {
    expect(nceaLevels.map((l) => l.level)).toEqual([1, 2, 3])
    for (const level of nceaLevels) {
      expect(level.creditsAtLevel).toBe(60)
      expect(level.coRequisite.literacy).toBe(10)
      expect(level.coRequisite.numeracy).toBe(10)
      // 现行规则没有「可含 20 个低一级学分」这一条
      expect(level.carriedCreditsAllowed).toBe(0)
      expectBilingual(level.name, `level ${level.level}`)
      expectBilingual(level.summary, `level ${level.level} summary`)
      expectBilingual(level.coRequisite.note, `level ${level.level} co-req`)
    }
  })

  it('UE 四项齐全且 id 固定', () => {
    expect(ueRequirements.map((r) => r.id)).toEqual([
      'ncea-level-3',
      'approved-subjects',
      'ue-literacy',
      'ue-numeracy',
    ])
    for (const r of ueRequirements) {
      expectBilingual(r.label, r.id)
      expectBilingual(r.rule, `${r.id}.rule`)
    }
  })

  it('认可科目：code 唯一、双语名称、数量合理', () => {
    const seen = new Set<string>()
    for (const s of ueApprovedSubjects) {
      expect(seen.has(s.code), `duplicate ${s.code}`).toBe(false)
      seen.add(s.code)
      expectBilingual(s.name, s.code)
      expect(s.code).toMatch(/^[a-z0-9-]+$/)
    }
    expect(ueApprovedSubjects.length).toBeGreaterThan(50)
  })

  it('改革时间线：年份递增、各年级对应一条、状态合法', () => {
    const years = reformMilestones.map((m) => m.year)
    expect([...years].sort((a, b) => a - b)).toEqual(years)
    expect(reformMilestones.map((m) => m.affectsYearLevel)).toEqual([11, 12, 13])
    for (const m of reformMilestones) {
      expect(['confirmed', 'proposed', 'tbc']).toContain(m.status)
      expectBilingual(m.event, String(m.year))
    }
  })

  it('新资格：官方未公布的字段保持 null，且不得标成 confirmed', () => {
    expect(newQualifications.map((q) => q.id)).toEqual(['foundational', 'nzce', 'nzace'])
    for (const q of newQualifications) {
      expectBilingual(q.name, q.id)
      expectBilingual(q.gradingScale, `${q.id}.gradingScale`)
      expectBilingual(q.assessment, `${q.id}.assessment`)
      expect(q.status, q.id).not.toBe('confirmed')
      expect(q.minSubjects, q.id).toBeNull()
      expect(q.minSubjectsToPass, q.id).toBeNull()
      expect(q.sourceUrl.startsWith('https://')).toBe(true)
      expect(q.lastVerified).toMatch(ISO_DATE)
    }
  })

  it('新资格数据文件整体标为未核实（设计尚未定稿）', () => {
    expect(newQualificationsFile._verify?.status).toBe('unverified')
  })

  it('IB/NCEA 对比：每行三列都双语，且标为编辑性归纳', () => {
    expect(comparisonRows.length).toBeGreaterThan(3)
    for (const row of comparisonRows) {
      expectBilingual(row.dimension, 'dimension')
      expectBilingual(row.ib, 'ib')
      expectBilingual(row.ncea, 'ncea')
    }
    expect(comparisonFile._verify?.status).toBe('unverified')
  })
})
