// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsStorage } from '../lib/settings'
import { usePersistedSettings } from './usePersistedSettings'

function memoryStorage(): SettingsStorage {
  return {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  }
}

describe('usePersistedSettings', () => {
  it('saves the current settings and resaves when they change', () => {
    const storage = memoryStorage()
    const initialSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      task: 'Open Settings',
    }
    const { rerender } = renderHook(
      ({ settings }) => usePersistedSettings(settings, storage),
      {
        initialProps: {
          settings: initialSettings,
        },
      },
    )

    expect(storage.setItem).toHaveBeenLastCalledWith(
      'webdroid-agent-settings',
      JSON.stringify(initialSettings),
    )

    const nextSettings: AppSettings = {
      ...initialSettings,
      maxSteps: 12,
      streamResponses: true,
    }
    rerender({ settings: nextSettings })

    expect(storage.setItem).toHaveBeenLastCalledWith(
      'webdroid-agent-settings',
      JSON.stringify(nextSettings),
    )
  })
})
