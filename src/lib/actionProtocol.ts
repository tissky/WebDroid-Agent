export const ACTION_PROTOCOLS = [
  'webdroid_json',
  'open_autoglm_function',
  'mobilerun_xml',
] as const

export type ActionProtocol = (typeof ACTION_PROTOCOLS)[number]

export const DEFAULT_ACTION_PROTOCOL: ActionProtocol = 'webdroid_json'

export function isActionProtocol(value: unknown): value is ActionProtocol {
  return typeof value === 'string' && ACTION_PROTOCOLS.includes(value as ActionProtocol)
}
