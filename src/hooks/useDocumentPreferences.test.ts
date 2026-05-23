// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '../lib/appCopy'
import type { ThemeMode } from '../lib/settings'
import { useDocumentPreferences } from './useDocumentPreferences'

function renderDocumentPreferences(themeMode: ThemeMode, locale: Locale) {
  return renderHook(
    ({ nextThemeMode, nextLocale }) => useDocumentPreferences(nextThemeMode, nextLocale),
    {
      initialProps: {
        nextThemeMode: themeMode,
        nextLocale: locale,
      },
    },
  )
}

function mockSystemDarkMode(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQueryList = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.add(listener)
      }
    }),
    removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.delete(listener)
      }
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => mediaQueryList),
  })

  return {
    emitChange(nextMatches: boolean) {
      mediaQueryList.matches = nextMatches
      listeners.forEach((listener) =>
        listener({ matches: nextMatches } as MediaQueryListEvent),
      )
    },
    mediaQueryList,
  }
}

describe('useDocumentPreferences', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-system-theme')
    document.documentElement.removeAttribute('lang')
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    })
  })

  it('writes the selected theme and locale to the document element', () => {
    const { rerender } = renderDocumentPreferences('light', 'en-US')

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.lang).toBe('en-US')

    rerender({ nextThemeMode: 'dark', nextLocale: 'zh-CN' })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('tracks system dark mode only when theme mode is system', () => {
    const systemTheme = mockSystemDarkMode(true)
    const { rerender } = renderDocumentPreferences('system', 'en-US')

    expect(document.documentElement.dataset.systemTheme).toBe('dark')

    systemTheme.emitChange(false)
    expect(document.documentElement.dataset.systemTheme).toBeUndefined()

    systemTheme.emitChange(true)
    expect(document.documentElement.dataset.systemTheme).toBe('dark')

    rerender({ nextThemeMode: 'light', nextLocale: 'en-US' })
    expect(document.documentElement.dataset.systemTheme).toBeUndefined()

    systemTheme.emitChange(true)
    expect(document.documentElement.dataset.systemTheme).toBeUndefined()
  })
})
