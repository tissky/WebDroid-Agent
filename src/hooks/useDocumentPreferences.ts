import { useEffect } from 'react'
import type { Locale } from '../lib/appCopy'
import type { ThemeMode } from '../lib/settings'

export function useDocumentPreferences(themeMode: ThemeMode, locale: Locale) {
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')

    function syncSystemTheme() {
      if (themeMode === 'system' && media?.matches) {
        document.documentElement.dataset.systemTheme = 'dark'
        return
      }
      delete document.documentElement.dataset.systemTheme
    }

    syncSystemTheme()
    media?.addEventListener('change', syncSystemTheme)
    return () => media?.removeEventListener('change', syncSystemTheme)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
}
