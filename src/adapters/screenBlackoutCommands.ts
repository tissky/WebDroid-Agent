export const SCREEN_BRIGHTNESS_SETTING_KEY = 'screen_brightness'
export const SCREEN_BRIGHTNESS_MODE_SETTING_KEY = 'screen_brightness_mode'
export const SCREEN_BRIGHTNESS_BLACKOUT_VALUE = '0'
export const SCREEN_BRIGHTNESS_MODE_MANUAL_VALUE = '0'

export type ScreenBlackoutRestoreSettings = {
  brightness: string | null
  brightnessMode: string | null
}

export function buildReadScreenBrightnessCommand() {
  return ['settings', 'get', 'system', SCREEN_BRIGHTNESS_SETTING_KEY] as const
}

export function buildReadScreenBrightnessModeCommand() {
  return ['settings', 'get', 'system', SCREEN_BRIGHTNESS_MODE_SETTING_KEY] as const
}

export function buildSetScreenBrightnessCommand(value: string) {
  return ['settings', 'put', 'system', SCREEN_BRIGHTNESS_SETTING_KEY, value] as const
}

export function buildSetScreenBrightnessModeCommand(value: string) {
  return ['settings', 'put', 'system', SCREEN_BRIGHTNESS_MODE_SETTING_KEY, value] as const
}

export function buildDeleteScreenBrightnessCommand() {
  return ['settings', 'delete', 'system', SCREEN_BRIGHTNESS_SETTING_KEY] as const
}

export function buildDeleteScreenBrightnessModeCommand() {
  return ['settings', 'delete', 'system', SCREEN_BRIGHTNESS_MODE_SETTING_KEY] as const
}

export function normalizeScreenSetting(value: string) {
  const trimmed = value.trim()
  return trimmed && trimmed !== 'null' ? trimmed : null
}
