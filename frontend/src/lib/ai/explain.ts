import type { LLMMessage } from './types'
import { redact } from './redact'

/**
 * 「为什么」解释器的 grounding 层。
 *
 * 红线：LLM **只解释注入的内容，不得断言注入内容之外的资格结论**。
 * 具体做法有三层：
 * 1. 只把规则引擎已经算好的结论作为 facts 注入；
 * 2. system prompt 明确禁止推断新结论、禁止说「你会/不会拿到文凭或 UE」之外的判断；
 * 3. 调用方拿到文本后仍以规则结果为准显示状态——解释文字永远不改变亮灯。
 */
export const EXPLAIN_SYSTEM_PROMPT = [
  'You explain a New Zealand secondary school subject plan to a parent.',
  'You are given FACTS that a deterministic rule engine has already decided.',
  'Rules you must follow:',
  '1. Never state a qualification outcome that is not in FACTS. If FACTS does not say it, say the tool cannot tell.',
  '2. Never invent credit numbers, thresholds, subject names or dates. Use only what is in FACTS.',
  '3. Do not tell the family which qualification or subject to choose. Explain trade-offs instead.',
  '4. Always end by pointing to the school and the official site for confirmation.',
  '5. Answer in the language requested, warmly and in plain words a parent can act on.',
].join('\n')

/** 允许注入的字段白名单——发出去的只有这些。 */
export const ALLOWED_FACT_KEYS = [
  'valid',
  'diplomaStatus',
  'total',
  'max',
  'failedConditions',
  'ueAwarded',
  'ueMissing',
  'pathwayStatuses',
  'warnings',
  'creditsCounted',
  'creditsRequired',
  'coRequisiteMet',
  'qualificationByYear',
] as const

export interface ExplainInput {
  facts: Record<string, unknown>
  language: 'en' | 'zh'
  question?: string
}

export function buildExplainMessages(input: ExplainInput): LLMMessage[] {
  const facts = redact(input.facts, ALLOWED_FACT_KEYS)
  const language = input.language === 'zh' ? 'Chinese (Simplified)' : 'English'
  return [
    { role: 'system', content: EXPLAIN_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `Language: ${language}`,
        'FACTS (from the rule engine, authoritative):',
        JSON.stringify(facts),
        input.question ? `Parent's question: ${input.question}` : 'Explain this result to the parent.',
      ].join('\n'),
    },
  ]
}
