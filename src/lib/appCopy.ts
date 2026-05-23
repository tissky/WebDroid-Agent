import { EN_US_COPY } from './appCopy.en-US'
import { ZH_CN_COPY } from './appCopy.zh-CN'
import type { LanguageMode } from './settings'

export type Locale = 'en-US' | 'zh-CN'

export const APP_COPY = {
  'en-US': EN_US_COPY,
  'zh-CN': ZH_CN_COPY,
} as const

export type AppCopy = (typeof APP_COPY)[Locale]

export function resolveLocale(languageMode: LanguageMode): Locale {
  if (languageMode === 'zh-CN' || languageMode === 'en-US') {
    return languageMode
  }

  const browserLanguage =
    globalThis.navigator?.languages?.[0] ?? globalThis.navigator?.language ?? 'en-US'
  return browserLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}
