import type { Level, Selection } from '../../../types/ib'

/** 简写：`sel(['lang-a-lit-en:HL', ...])` → Selection。 */
export function sel(codes: string[], extra: Partial<Selection> = {}): Selection {
  return {
    subjects: codes.map((entry) => {
      const [code = '', level = 'SL'] = entry.split(':')
      return { code, level: level as Level }
    }),
    targetPathwayIds: [],
    targetUniversityIds: [],
    ...extra,
  }
}

/** 合法基线：英语 A(HL) / 中文 B(SL) / 历史(SL) / 化学(HL) / 数学 AA(HL) / 视觉艺术(SL)。 */
export const BASELINE = [
  'lang-a-lit-en:HL',
  'mandarin-b:SL',
  'history:SL',
  'chemistry:HL',
  'math-aa:HL',
  'visual-arts:SL',
]
