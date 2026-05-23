import { describe, expect, it } from 'vitest'
import { APP_COPY, resolveLocale } from './appCopy'
import { EN_US_COPY } from './appCopy.en-US'
import { ZH_CN_COPY } from './appCopy.zh-CN'

describe('app copy', () => {
  it('aggregates copy from language-specific modules', () => {
    expect(APP_COPY['en-US']).toBe(EN_US_COPY)
    expect(APP_COPY['zh-CN']).toBe(ZH_CN_COPY)
  })

  it('keeps locale copy keys aligned', () => {
    expect(Object.keys(APP_COPY['zh-CN']).sort()).toEqual(Object.keys(APP_COPY['en-US']).sort())
  })

  it('resolves explicit and browser locales', () => {
    expect(resolveLocale('en-US')).toBe('en-US')
    expect(resolveLocale('zh-CN')).toBe('zh-CN')

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { language: 'zh-Hans-CN', languages: [] },
    })
    expect(resolveLocale('system')).toBe('zh-CN')
  })
})
