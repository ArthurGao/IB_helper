import type { Pathway, PathwayMatch, PathwayStatus, Selection, Subject } from '../../types/ib'
import { pathways as defaultPathways, subjects as defaultSubjects } from '../../data'
import { hasTag, indexSubjects, resolveSelection } from './subjectUtils'

export interface PathwayDeps {
  subjects: Subject[]
  pathways: Pathway[]
}

/**
 * 需求 token 的写法（来自 pathways.json）：
 * - `chemistry`            → 必须 HL 化学
 * - `physics|computer-science` → HL 物理 或 HL 计算机科学（任一即可）
 * - `tag:science`          → 任一带 science 标签的 HL 科目
 */
function tokenMet(token: string, hlSubjects: Subject[]): boolean {
  return token.split('|').some((alt) => {
    const trimmed = alt.trim()
    if (trimmed.startsWith('tag:')) {
      const tag = trimmed.slice('tag:'.length)
      return hlSubjects.some((s) => hasTag(s, tag))
    }
    return hlSubjects.some((s) => s.code === trimmed)
  })
}

function split(tokens: string[], hlSubjects: Subject[]): { met: string[]; missing: string[] } {
  const met: string[] = []
  const missing: string[] = []
  for (const token of tokens) {
    if (tokenMet(token, hlSubjects)) met.push(token)
    else missing.push(token)
  }
  return { met, missing }
}

function statusOf(requiredMissing: string[], recommendedMissing: string[]): PathwayStatus {
  if (requiredMissing.length > 0) return 'not-met'
  if (recommendedMissing.length > 0) return 'partial'
  return 'meets'
}

/**
 * 7.4 目标方向匹配：返回每个方向的 met / missing，以及与**通用建议**的符合程度。
 * 注意这不是录取判定——具体大学与专业的要求以其官网为准（见 pathway.note）。
 */
export function matchPathways(
  selection: Selection,
  targetPathwayIds: string[] = selection.targetPathwayIds,
  deps: PathwayDeps = { subjects: defaultSubjects, pathways: defaultPathways },
): PathwayMatch[] {
  const resolved = resolveSelection(selection.subjects, indexSubjects(deps.subjects))
  const hlSubjects = resolved.filter((r) => r.level === 'HL').map((r) => r.subject)

  const matches: PathwayMatch[] = []
  for (const id of targetPathwayIds) {
    const pathway = deps.pathways.find((p) => p.id === id)
    if (!pathway) continue
    const required = split(pathway.requiredHL, hlSubjects)
    const recommended = split(pathway.recommendedHL, hlSubjects)
    matches.push({
      pathwayId: pathway.id,
      name: pathway.name,
      status: statusOf(required.missing, recommended.missing),
      requiredMet: required.met,
      requiredMissing: required.missing,
      recommendedMet: recommended.met,
      recommendedMissing: recommended.missing,
      note: pathway.note,
    })
  }
  return matches
}
