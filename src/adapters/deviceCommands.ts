import type { AgentAction, KeyAction } from '../lib/actionTypes'
import { resolveAppPackage } from './appPackages'
import { resolveInstalledAppPackage } from './installedApps'
import {
  DeviceBackendError,
  type DeviceCommandStep,
  type DeviceTimingConfig,
  type ExecuteActionOptions,
  type InstalledApp,
} from './deviceTypes'

export const DEFAULT_ACTION_SETTLE_DELAY_MS = 1000
export const DEFAULT_DOUBLE_TAP_INTERVAL_MS = 100
export const DEFAULT_KEYBOARD_STEP_DELAY_MS = 1000
export const ADB_KEYBOARD_IME = 'com.android.adbkeyboard/.AdbIME'
export const ADB_KEYBOARD_APK_URL =
  'https://raw.githubusercontent.com/senzhk/ADBKeyBoard/master/ADBKeyboard.apk'
export const ADB_KEYBOARD_REMOTE_APK_PATH = '/data/local/tmp/webdroid-adbkeyboard.apk'
export const DEFAULT_DEVICE_TIMING: DeviceTimingConfig = {
  actionSettleMs: DEFAULT_ACTION_SETTLE_DELAY_MS,
  doubleTapIntervalMs: DEFAULT_DOUBLE_TAP_INTERVAL_MS,
  keyboardStepMs: DEFAULT_KEYBOARD_STEP_DELAY_MS,
}

export function buildInputCommand(action: AgentAction): readonly string[] | null {
  const sequence = buildInputCommandSequence(action)
  const first = sequence[0]
  return Array.isArray(first) ? first : null
}

export function buildInputCommandSequence(
  action: AgentAction,
  timing: DeviceTimingConfig = DEFAULT_DEVICE_TIMING,
  installedApps?: readonly InstalledApp[],
): DeviceCommandStep[] {
  switch (action.action) {
    case 'launch': {
      const packageName =
        action.packageName ??
        resolveInstalledAppPackage(action.app, installedApps) ??
        resolveAppPackage(action.app)
      if (!packageName) {
        throw new DeviceBackendError(`No package mapping found for "${action.app}".`)
      }
      return withActionSettle([
        ['monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'],
      ], timing)
    }
    case 'tap':
      return withActionSettle([['input', 'tap', String(action.x), String(action.y)]], timing)
    case 'swipe':
      return withActionSettle([
        [
          'input',
          'swipe',
          String(action.fromX),
          String(action.fromY),
          String(action.toX),
          String(action.toY),
          String(action.durationMs ?? 400),
        ],
      ], timing)
    case 'input_text':
      return withActionSettle([['input', 'text', escapeInputText(action.text)]], timing)
    case 'key':
      return withActionSettle([['input', 'keyevent', keyToAndroidKeyCode(action.key)]], timing)
    case 'back':
      return withActionSettle([['input', 'keyevent', 'KEYCODE_BACK']], timing)
    case 'home':
      return withActionSettle([['input', 'keyevent', 'KEYCODE_HOME']], timing)
    case 'long_press':
      return withActionSettle([
        [
          'input',
          'swipe',
          String(action.x),
          String(action.y),
          String(action.x),
          String(action.y),
          String(action.durationMs),
        ],
      ], timing)
    case 'double_tap':
      return withActionSettle([
        ['input', 'tap', String(action.x), String(action.y)],
        { waitMs: timing.doubleTapIntervalMs },
        ['input', 'tap', String(action.x), String(action.y)],
      ], timing)
    case 'call_api':
    case 'interact':
    case 'note':
    case 'take_over':
    case 'wait':
    case 'done':
      return []
  }
}

export function escapeInputText(text: string) {
  return text.replace(/\s/g, '%s')
}

export function isAndroidInputTextSafe(text: string) {
  return /^[A-Za-z0-9 .,@_:+\\/-]+$/.test(text)
}

export function isAdbKeyboardInstalled(imeListOutput: string) {
  return findAdbKeyboardIme(imeListOutput) !== null
}

export function findAdbKeyboardIme(imeListOutput: string) {
  const imes = imeListOutput.split(/\s+/).map(normalizeImeListItem).filter(Boolean)
  const exact = imes.find((ime) => ime === ADB_KEYBOARD_IME)
  if (exact) {
    return exact
  }

  return (
    imes.find((ime) => {
      const lower = ime.toLowerCase()
      return lower.includes('autoglm') || lower.includes('adbkeyboard') || lower.endsWith('/.adbime')
    }) ?? null
  )
}

export function encodeAdbKeyboardText(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export function keyToAndroidKeyCode(key: KeyAction['key']) {
  const keycodes: Record<KeyAction['key'], string> = {
    APP_SWITCH: 'KEYCODE_APP_SWITCH',
    BACK: 'KEYCODE_BACK',
    CAMERA: 'KEYCODE_CAMERA',
    ENTER: 'KEYCODE_ENTER',
    HOME: 'KEYCODE_HOME',
    MENU: 'KEYCODE_MENU',
    POWER: 'KEYCODE_POWER',
    SEARCH: 'KEYCODE_SEARCH',
    VOLUME_DOWN: 'KEYCODE_VOLUME_DOWN',
    VOLUME_UP: 'KEYCODE_VOLUME_UP',
  }

  return keycodes[key]
}

export function getSensitiveActionMessage(action: AgentAction): string | null {
  if (action.action !== 'tap') {
    return null
  }

  if (action.message) {
    return action.message
  }

  if (action.risk === 'sensitive') {
    return `Sensitive tap at (${action.x}, ${action.y})`
  }

  return null
}

export async function assertSensitiveActionConfirmed(
  action: AgentAction,
  options?: ExecuteActionOptions,
) {
  const message = getSensitiveActionMessage(action)
  if (!message) {
    return
  }

  const confirmed = options?.confirmSensitiveAction
    ? await options.confirmSensitiveAction(message, action)
    : false

  if (!confirmed) {
    throw new DeviceBackendError(`Sensitive action blocked: ${message}`)
  }
}

function withActionSettle(
  sequence: DeviceCommandStep[],
  timing: DeviceTimingConfig,
): DeviceCommandStep[] {
  return [...sequence, { waitMs: timing.actionSettleMs }]
}

function normalizeImeListItem(value: string) {
  return value.replace(/^ime:/, '').trim()
}
