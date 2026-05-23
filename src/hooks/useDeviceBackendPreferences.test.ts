// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDeviceBackendPreferences } from './useDeviceBackendPreferences'

function createBackendPreferenceTarget() {
  return {
    setPreferAdbKeyboard: vi.fn(),
    setTimingConfig: vi.fn(),
  }
}

describe('useDeviceBackendPreferences', () => {
  it('syncs keyboard and timing preferences to the backend', () => {
    const backend = createBackendPreferenceTarget()
    const { rerender } = renderHook(
      ({ preferAdbKeyboard, actionSettleMs, doubleTapIntervalMs, keyboardStepMs }) =>
        useDeviceBackendPreferences(backend, {
          preferAdbKeyboard,
          actionSettleMs,
          doubleTapIntervalMs,
          keyboardStepMs,
        }),
      {
        initialProps: {
          preferAdbKeyboard: false,
          actionSettleMs: 1000,
          doubleTapIntervalMs: 100,
          keyboardStepMs: 1000,
        },
      },
    )

    expect(backend.setPreferAdbKeyboard).toHaveBeenLastCalledWith(false)
    expect(backend.setTimingConfig).toHaveBeenLastCalledWith({
      actionSettleMs: 1000,
      doubleTapIntervalMs: 100,
      keyboardStepMs: 1000,
    })

    rerender({
      preferAdbKeyboard: true,
      actionSettleMs: 1200,
      doubleTapIntervalMs: 150,
      keyboardStepMs: 900,
    })

    expect(backend.setPreferAdbKeyboard).toHaveBeenLastCalledWith(true)
    expect(backend.setTimingConfig).toHaveBeenLastCalledWith({
      actionSettleMs: 1200,
      doubleTapIntervalMs: 150,
      keyboardStepMs: 900,
    })
  })
})
