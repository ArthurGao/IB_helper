import type { NewQualification, QualificationYearRow, ReformMilestone } from '../../types/ncea'
import { newQualifications, reformMilestones } from '../../data/ncea'

export interface ResolveDeps {
  milestones: ReformMilestone[]
  qualifications: NewQualification[]
  /** 推算到哪一年级为止（新西兰高中止于 Year 13）。 */
  finalYearLevel: number
}

const defaultDeps: ResolveDeps = {
  milestones: reformMilestones,
  qualifications: newQualifications,
  finalYearLevel: 13,
}

const NCEA_BY_YEAR_LEVEL: Record<number, QualificationYearRow['qualification']> = {
  11: 'ncea-1',
  12: 'ncea-2',
  13: 'ncea-3',
}

/**
 * 「我的孩子考哪一套」——按年级逐年推算所考资格。
 *
 * 全部依据 reform-timeline.json，**引擎里不硬编码任何年份**：
 * 新增或修改一个里程碑只改数据。判定规则：某一年级在某年若已有对应的新资格里程碑
 * 且该年 >= 里程碑年份，则考新资格，否则仍考 NCEA。
 *
 * 只覆盖 Year 11–13（NCEA / 新资格的适用范围）；更低年级如实标为不适用。
 */
export function resolveQualificationByYear(
  yearLevel: number,
  calendarYear: number,
  deps: ResolveDeps = defaultDeps,
): QualificationYearRow[] {
  const rows: QualificationYearRow[] = []
  const byYearLevel = new Map<number, ReformMilestone>()
  for (const m of deps.milestones) {
    if (m.affectsYearLevel !== undefined) byYearLevel.set(m.affectsYearLevel, m)
  }
  const qualByYearLevel = new Map<number, NewQualification>()
  for (const q of deps.qualifications) {
    if (q.yearLevel !== undefined) qualByYearLevel.set(q.yearLevel, q)
  }

  for (let level = yearLevel; level <= deps.finalYearLevel; level += 1) {
    const year = calendarYear + (level - yearLevel)

    if (!(level in NCEA_BY_YEAR_LEVEL)) {
      rows.push({
        year,
        yearLevel: level,
        qualification: 'unknown',
        status: 'confirmed',
        note: {
          en: 'Below Year 11 - no senior qualification is sat in this year.',
          zh: '低于 Year 11——这一年不参加高中学历考试。',
        },
      })
      continue
    }

    const milestone = byYearLevel.get(level)
    const newQual = qualByYearLevel.get(level)
    const switchesToNew = milestone !== undefined && newQual !== undefined && year >= milestone.year

    if (switchesToNew) {
      rows.push({
        year,
        yearLevel: level,
        qualification: newQual.id,
        status: milestone.status,
        note: milestone.event,
      })
    } else {
      rows.push({
        year,
        yearLevel: level,
        qualification: NCEA_BY_YEAR_LEVEL[level] ?? 'unknown',
        status: 'confirmed',
        note: milestone
          ? {
              en: `Still NCEA: the replacement for Year ${level} starts in ${milestone.year}.`,
              zh: `仍考 NCEA：Year ${level} 的替代资格从 ${milestone.year} 年开始。`,
            }
          : {
              en: 'Still NCEA - no replacement date published for this year level.',
              zh: '仍考 NCEA——该年级的替代日期官方尚未公布。',
            },
      })
    }
  }

  return rows
}
