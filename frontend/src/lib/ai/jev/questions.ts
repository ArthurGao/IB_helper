import type { JevQuestion } from '../types'

/**
 * Jev 的输入按其**真实形态**建模（2026-09-29 查 Gateway 目录）：
 * 「接受 shared state 与 typed questions，返回 choices、scores、boolean probabilities」。
 * 增量规格 §3.2 里那几个 interface 是按「一个 schema 进、一个对象出」写的，与实际不符，
 * 因此改写成问题集。
 */

/** 画像抽取（规格 3.a）：从家长的自由描述里抽出类型化特征。 */
export const PROFILE_QUESTIONS: JevQuestion[] = [
  {
    id: 'workStyle',
    kind: 'choice',
    prompt: 'Which working style best matches this student?',
    options: ['hands_on', 'analytical', 'creative', 'mixed'],
  },
  {
    id: 'riskTolerance',
    kind: 'choice',
    prompt: 'How much academic risk is this family comfortable with?',
    options: ['low', 'medium', 'high'],
  },
  {
    id: 'quantitativeAffinity',
    kind: 'score',
    prompt: 'How strong is the affinity for quantitative subjects?',
    min: 0,
    max: 1,
  },
  {
    id: 'humanitiesAffinity',
    kind: 'score',
    prompt: 'How strong is the affinity for humanities subjects?',
    min: 0,
    max: 1,
  },
]

/**
 * 契合打分（规格 3.b）：只对**已通过规则校验**的候选组合打分。
 * 每个候选一个 score 问题，Jev 单次并行返回。
 */
export function fitQuestions(candidateIds: string[]): JevQuestion[] {
  return candidateIds.map((id) => ({
    id: `fit:${id}`,
    kind: 'score' as const,
    prompt: `How well does candidate ${id} fit this student's profile?`,
    min: 0,
    max: 1,
  }))
}
