export const STAY_AWAKE_SETTING_KEY = 'stay_on_while_plugged_in'

export function buildReadStayAwakeSettingCommand() {
  return ['settings', 'get', 'global', STAY_AWAKE_SETTING_KEY] as const
}

export function buildEnableStayAwakeCommand() {
  return ['svc', 'power', 'stayon', 'usb'] as const
}

export function buildDisableStayAwakeCommand() {
  return ['svc', 'power', 'stayon', 'false'] as const
}

export function buildRestoreStayAwakeSettingCommand(value: string) {
  return ['settings', 'put', 'global', STAY_AWAKE_SETTING_KEY, value] as const
}

export function buildWakeDeviceCommand() {
  return ['input', 'keyevent', 'KEYCODE_WAKEUP'] as const
}

export function normalizeStayAwakeSetting(value: string) {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? trimmed : null
}
