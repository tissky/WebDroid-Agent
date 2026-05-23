import { useEffect } from 'react'
import type { DeviceTimingConfig } from '../adapters/deviceTypes'

export type DeviceBackendPreferenceTarget = {
  setPreferAdbKeyboard(value: boolean): void
  setTimingConfig(value: DeviceTimingConfig): void
}

export type DeviceBackendPreferences = DeviceTimingConfig & {
  preferAdbKeyboard: boolean
}

export function useDeviceBackendPreferences(
  backend: DeviceBackendPreferenceTarget,
  {
    actionSettleMs,
    doubleTapIntervalMs,
    keyboardStepMs,
    preferAdbKeyboard,
  }: DeviceBackendPreferences,
) {
  useEffect(() => {
    backend.setPreferAdbKeyboard(preferAdbKeyboard)
  }, [backend, preferAdbKeyboard])

  useEffect(() => {
    backend.setTimingConfig({
      actionSettleMs,
      doubleTapIntervalMs,
      keyboardStepMs,
    })
  }, [actionSettleMs, backend, doubleTapIntervalMs, keyboardStepMs])
}
