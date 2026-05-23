import { useEffect } from 'react'
import { saveSettings, type AppSettings, type SettingsStorage } from '../lib/settings'

export function usePersistedSettings(settings: AppSettings, storage?: SettingsStorage) {
  useEffect(() => {
    saveSettings(settings, storage)
  }, [settings, storage])
}
