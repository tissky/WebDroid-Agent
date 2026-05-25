import type { DeviceTimingConfig } from './deviceTypes'

export const DEFAULT_ACTION_SETTLE_DELAY_MS = 1000
export const DEFAULT_DOUBLE_TAP_INTERVAL_MS = 100
export const DEFAULT_KEYBOARD_STEP_DELAY_MS = 1000

export const DEFAULT_DEVICE_TIMING: DeviceTimingConfig = {
  actionSettleMs: DEFAULT_ACTION_SETTLE_DELAY_MS,
  doubleTapIntervalMs: DEFAULT_DOUBLE_TAP_INTERVAL_MS,
  keyboardStepMs: DEFAULT_KEYBOARD_STEP_DELAY_MS,
}
