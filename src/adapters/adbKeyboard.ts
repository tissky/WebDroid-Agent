export const ADB_KEYBOARD_IME = 'com.android.adbkeyboard/.AdbIME'
export const ADB_KEYBOARD_APK_URL =
  'https://raw.githubusercontent.com/senzhk/ADBKeyBoard/master/ADBKeyboard.apk'
export const ADB_KEYBOARD_REMOTE_APK_PATH = '/data/local/tmp/webdroid-adbkeyboard.apk'

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

function normalizeImeListItem(value: string) {
  return value.replace(/^ime:/, '').trim()
}
