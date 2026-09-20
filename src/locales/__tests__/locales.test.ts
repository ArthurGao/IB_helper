import { describe, expect, it } from 'vitest'
import { resources } from '../../i18n'

type Json = Record<string, unknown>

function flatten(value: Json, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child !== null && typeof child === 'object'
      ? flatten(child as Json, path)
      : [path]
  })
}

const namespaces = Object.keys(resources.en) as Array<keyof typeof resources.en>

describe('i18n 文案', () => {
  it.each(namespaces)('%s：中英 key 集合完全一致（无残留未翻译文案）', (ns) => {
    const en = flatten(resources.en[ns] as unknown as Json).sort()
    const zh = flatten(resources['zh-CN'][ns] as unknown as Json).sort()
    expect(zh).toEqual(en)
  })

  it.each(namespaces)('%s：没有空字符串文案', (ns) => {
    for (const lang of ['en', 'zh-CN'] as const) {
      const bundle = resources[lang][ns] as unknown as Json
      for (const key of flatten(bundle)) {
        const value = key
          .split('.')
          .reduce<unknown>((acc, part) => (acc as Json)?.[part], bundle)
        expect(String(value).trim().length, `${lang}/${ns}.${key}`).toBeGreaterThan(0)
      }
    }
  })
})
